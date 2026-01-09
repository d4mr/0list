import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, like, desc, asc, sql, count } from "drizzle-orm";
import type { Env, Variables } from "../bindings";
import { createDb, waitlists, signups } from "../db";
import { Errors } from "../lib/errors";
import { slugify, getBaseUrl } from "../lib/utils";
import { requireAuth, checkAuth } from "../middleware/auth";
import { renderEmailPreview } from "../emails/send";

// ============ Schemas ============

const customFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "select"]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const createWaitlistSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).optional(),
  logoUrl: z.string().url().nullish(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  doubleOptIn: z.boolean().nullish(),
  redirectUrl: z.string().url().nullish(),
  customFields: z.array(customFieldSchema).nullish(),
  notifyOnSignup: z.boolean().nullish(),
  notifyEmail: z.string().email().nullish(),
  webhookUrl: z.string().url().nullish(),
  emailFromName: z.string().nullish(),
  emailSubjectConfirmation: z.string().nullish(),
  emailSubjectWelcome: z.string().nullish(),
  allowedOrigins: z.array(z.string()).nullish(),
});

const updateWaitlistSchema = createWaitlistSchema.partial();

const updateSignupSchema = z.object({
  status: z.enum(["pending", "confirmed", "invited"]).optional(),
});

const signupsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(["pending", "confirmed", "invited"]).optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const statsQuerySchema = z.object({
  from: z.string().optional(), // ISO date string
  to: z.string().optional(),   // ISO date string
  compare: z.enum(["true", "false"]).optional(), // Compare to previous period
});

// ============ Create Routes ============

const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()
  // Auth check endpoint (unprotected - checks if user is authenticated)
  .get("/auth", checkAuth)

  // All routes below require Cloudflare Access authentication
  .use("/*", requireAuth)

  // Waitlists
  .get("/waitlists", async (c) => {
    const db = createDb(c.env.DB);

    const allWaitlists = await db
      .select({
        id: waitlists.id,
        name: waitlists.name,
        slug: waitlists.slug,
        logoUrl: waitlists.logoUrl,
        primaryColor: waitlists.primaryColor,
        createdAt: waitlists.createdAt,
        signupCount: sql<number>`COUNT(${signups.id})`,
        confirmedCount: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(waitlists)
      .leftJoin(signups, eq(signups.waitlistId, waitlists.id))
      .groupBy(waitlists.id)
      .orderBy(desc(waitlists.createdAt));

    return c.json({ waitlists: allWaitlists });
  })

  // Dashboard aggregate stats
  .get("/stats", zValidator("query", statsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const db = createDb(c.env.DB);

    // Parse date range (default to last 30 days)
    // Use UTC consistently to avoid timezone issues
    const now = new Date();
    const toDateStr = query.to || now.toISOString().split('T')[0];
    const fromDateStr = query.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parse as UTC dates (add T00:00:00Z to ensure UTC parsing)
    const fromDate = new Date(fromDateStr + 'T00:00:00Z');
    const toDate = new Date(toDateStr + 'T23:59:59.999Z');

    // Convert to seconds (SQLite stores timestamps as seconds, not milliseconds)
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);
    const periodLength = toTimestamp - fromTimestamp;
    const prevFromTimestamp = fromTimestamp - periodLength;
    const prevToTimestamp = fromTimestamp - 1;

    // Current period signups
    const currentConditions = [
      sql`${signups.createdAt} >= ${fromTimestamp}`,
      sql`${signups.createdAt} <= ${toTimestamp}`,
    ];

    const [currentTotals] = await db
      .select({
        total: count(),
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(signups)
      .where(and(...currentConditions));

    // Previous period for comparison
    let previousTotals = { total: 0, confirmed: 0 };
    if (query.compare === "true") {
      const [prev] = await db
        .select({
          total: count(),
          confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
        })
        .from(signups)
        .where(and(
          sql`${signups.createdAt} >= ${prevFromTimestamp}`,
          sql`${signups.createdAt} <= ${prevToTimestamp}`,
        ));
      previousTotals = { total: prev?.total || 0, confirmed: prev?.confirmed || 0 };
    }

    // All-time totals
    const [allTimeTotals] = await db
      .select({
        total: count(),
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(signups);

    // Waitlist count
    const [waitlistCount] = await db.select({ count: count() }).from(waitlists);

    // Daily signups across all waitlists
    // Note: createdAt is stored in seconds (not milliseconds)
    const dailySignups = await db
      .select({
        date: sql<string>`DATE(${signups.createdAt}, 'unixepoch')`,
        count: count(),
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(sql`DATE(${signups.createdAt}, 'unixepoch')`)
      .orderBy(asc(sql`DATE(${signups.createdAt}, 'unixepoch')`));

    // Fill in missing dates (use UTC to avoid timezone issues)
    const filledDailySignups: { date: string; count: number; confirmed: number }[] = [];
    const dateMap = new Map(dailySignups.map(d => [d.date, { count: d.count, confirmed: d.confirmed }]));

    // Create a new date at UTC midnight for the start date
    const startDate = new Date(fromDateStr + 'T00:00:00Z');
    const endDate = new Date(toDateStr + 'T00:00:00Z');

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      filledDailySignups.push({
        date: dateStr,
        count: data?.count ?? 0,
        confirmed: data?.confirmed ?? 0,
      });
    }

    // Top performing waitlists in period
    const topWaitlists = await db
      .select({
        id: waitlists.id,
        name: waitlists.name,
        slug: waitlists.slug,
        primaryColor: waitlists.primaryColor,
        signups: sql<number>`COUNT(${signups.id})`,
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(waitlists)
      .leftJoin(signups, and(
        eq(signups.waitlistId, waitlists.id),
        sql`${signups.createdAt} >= ${fromTimestamp}`,
        sql`${signups.createdAt} <= ${toTimestamp}`,
      ))
      .groupBy(waitlists.id)
      .orderBy(desc(sql`COUNT(${signups.id})`))
      .limit(5);

    // Source breakdown across all waitlists
    const sources = await db
      .select({
        source: signups.referralSource,
        count: count(),
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(signups.referralSource)
      .orderBy(desc(count()))
      .limit(10);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const currentRate = currentTotals?.total
      ? Math.round((currentTotals.confirmed / currentTotals.total) * 100)
      : 0;
    const previousRate = previousTotals.total
      ? Math.round((previousTotals.confirmed / previousTotals.total) * 100)
      : 0;

    return c.json({
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      overview: {
        waitlists: waitlistCount?.count || 0,
        signups: {
          current: currentTotals?.total || 0,
          previous: previousTotals.total,
          allTime: allTimeTotals?.total || 0,
          change: calculateChange(currentTotals?.total || 0, previousTotals.total),
        },
        confirmed: {
          current: currentTotals?.confirmed || 0,
          previous: previousTotals.confirmed,
          allTime: allTimeTotals?.confirmed || 0,
          change: calculateChange(currentTotals?.confirmed || 0, previousTotals.confirmed),
        },
        confirmationRate: {
          current: currentRate,
          previous: previousRate,
          change: currentRate - previousRate,
        },
      },
      dailySignups: filledDailySignups,
      topWaitlists: topWaitlists.map(w => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        primaryColor: w.primaryColor,
        signups: w.signups || 0,
        confirmed: w.confirmed || 0,
        rate: w.signups ? Math.round((w.confirmed / w.signups) * 100) : 0,
      })),
      sources: sources.map(s => ({
        source: s.source || "direct",
        count: s.count,
      })),
    });
  })

  .post("/waitlists", zValidator("json", createWaitlistSchema), async (c) => {
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const slug = body.slug || slugify(body.name);

    const existing = await db.query.waitlists.findFirst({
      where: eq(waitlists.slug, slug),
    });

    if (existing) {
      throw Errors.AlreadyExists("Waitlist with this slug");
    }

    const [newWaitlist] = await db
      .insert(waitlists)
      .values({
        name: body.name,
        slug,
        logoUrl: body.logoUrl ?? null,
        primaryColor: body.primaryColor || "#6366f1",
        doubleOptIn: body.doubleOptIn ?? true,
        redirectUrl: body.redirectUrl ?? null,
        customFields: body.customFields || [],
        notifyOnSignup: body.notifyOnSignup ?? true,
        notifyEmail: body.notifyEmail ?? null,
        webhookUrl: body.webhookUrl ?? null,
        emailFromName: body.emailFromName ?? null,
        emailSubjectConfirmation: body.emailSubjectConfirmation ?? null,
        emailSubjectWelcome: body.emailSubjectWelcome ?? null,
      })
      .returning();

    return c.json({ waitlist: newWaitlist }, 201);
  })

  .get("/waitlists/:id", async (c) => {
    const { id } = c.req.param();
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    return c.json({ waitlist });
  })

  .patch("/waitlists/:id", zValidator("json", updateWaitlistSchema), async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const existing = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!existing) {
      throw Errors.WaitlistNotFound();
    }

    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await db.query.waitlists.findFirst({
        where: eq(waitlists.slug, body.slug),
      });
      if (slugExists) {
        throw Errors.AlreadyExists("Waitlist with this slug");
      }
    }

    const [updated] = await db
      .update(waitlists)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(waitlists.id, id))
      .returning();

    return c.json({ waitlist: updated });
  })

  .delete("/waitlists/:id", async (c) => {
    const { id } = c.req.param();
    const db = createDb(c.env.DB);

    const existing = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!existing) {
      throw Errors.WaitlistNotFound();
    }

    await db.delete(waitlists).where(eq(waitlists.id, id));

    return c.json({ success: true });
  })

  // Signups
  .get("/waitlists/:id/signups", zValidator("query", signupsQuerySchema), async (c) => {
    const { id } = c.req.param();
    const query = c.req.valid("query");
    const db = createDb(c.env.DB);

    const page = Math.max(1, parseInt(query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50")));
    const search = query.search?.trim();
    const status = query.status;
    const sort = query.sort || "position";
    const order = query.order === "asc" ? "asc" : "desc";

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    const conditions = [eq(signups.waitlistId, id)];

    if (search) {
      conditions.push(like(signups.email, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(signups.status, status));
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(signups)
      .where(and(...conditions));

    const orderFn = order === "asc" ? asc : desc;
    const orderColumn =
      sort === "email" ? signups.email :
      sort === "status" ? signups.status :
      sort === "createdAt" ? signups.createdAt :
      signups.position;

    const results = await db
      .select()
      .from(signups)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    return c.json({
      signups: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })

  .get("/waitlists/:id/signups/export", async (c) => {
    const { id } = c.req.param();
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    const allSignups = await db
      .select()
      .from(signups)
      .where(eq(signups.waitlistId, id))
      .orderBy(asc(signups.position));

    const customFieldKeys = (waitlist.customFields || []).map((f) => f.key);
    const headers = ["position", "email", "status", "referral_source", ...customFieldKeys, "confirmed_at", "created_at"];

    const rows = allSignups.map((s) => {
      const customData = (s.customData || {}) as Record<string, string>;
      return [
        s.position.toString(),
        s.email,
        s.status,
        s.referralSource || "",
        ...customFieldKeys.map((k) => customData[k] || ""),
        s.confirmedAt?.toISOString() || "",
        s.createdAt.toISOString(),
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", `attachment; filename="${waitlist.slug}-signups.csv"`);

    return c.body(csv);
  })

  .patch("/waitlists/:id/signups/:signupId", zValidator("json", updateSignupSchema), async (c) => {
    const { id, signupId } = c.req.param();
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const signup = await db.query.signups.findFirst({
      where: and(eq(signups.id, signupId), eq(signups.waitlistId, id)),
    });

    if (!signup) {
      throw Errors.SignupNotFound();
    }

    const updates: Record<string, unknown> = {};

    if (body.status) {
      updates.status = body.status;
      if (body.status === "confirmed" && !signup.confirmedAt) {
        updates.confirmedAt = new Date();
      }
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ signup });
    }

    const [updated] = await db
      .update(signups)
      .set(updates)
      .where(eq(signups.id, signupId))
      .returning();

    return c.json({ signup: updated });
  })

  // Stats
  .get("/waitlists/:id/stats", zValidator("query", statsQuerySchema), async (c) => {
    const { id } = c.req.param();
    const query = c.req.valid("query");
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    // Parse date range (default to last 30 days)
    // Use UTC consistently to avoid timezone issues
    const now = new Date();
    const toDateStr = query.to || now.toISOString().split('T')[0];
    const fromDateStr = query.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parse as UTC dates (add T00:00:00Z to ensure UTC parsing)
    const fromDate = new Date(fromDateStr + 'T00:00:00Z');
    const toDate = new Date(toDateStr + 'T23:59:59.999Z');

    // Convert to seconds (SQLite stores timestamps as seconds, not milliseconds)
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);
    const periodLength = toTimestamp - fromTimestamp;

    // Previous period for comparison
    const prevFromTimestamp = fromTimestamp - periodLength;
    const prevToTimestamp = fromTimestamp - 1;

    // Get counts for current period
    const currentConditions = [
      eq(signups.waitlistId, id),
      sql`${signups.createdAt} >= ${fromTimestamp}`,
      sql`${signups.createdAt} <= ${toTimestamp}`,
    ];

    const currentStatusCounts = await db
      .select({
        status: signups.status,
        count: count(),
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(signups.status);

    const currentCounts = { total: 0, pending: 0, confirmed: 0, invited: 0 };
    for (const row of currentStatusCounts) {
      currentCounts[row.status as keyof typeof currentCounts] = row.count;
      currentCounts.total += row.count;
    }

    // Get counts for previous period (for comparison)
    let previousCounts = { total: 0, pending: 0, confirmed: 0, invited: 0 };
    if (query.compare === "true") {
      const prevConditions = [
        eq(signups.waitlistId, id),
        sql`${signups.createdAt} >= ${prevFromTimestamp}`,
        sql`${signups.createdAt} <= ${prevToTimestamp}`,
      ];

      const prevStatusCounts = await db
        .select({
          status: signups.status,
          count: count(),
        })
        .from(signups)
        .where(and(...prevConditions))
        .groupBy(signups.status);

      for (const row of prevStatusCounts) {
        previousCounts[row.status as keyof typeof previousCounts] = row.count;
        previousCounts.total += row.count;
      }
    }

    // Get all-time counts
    const allTimeStatusCounts = await db
      .select({
        status: signups.status,
        count: count(),
      })
      .from(signups)
      .where(eq(signups.waitlistId, id))
      .groupBy(signups.status);

    const allTimeCounts = { total: 0, pending: 0, confirmed: 0, invited: 0 };
    for (const row of allTimeStatusCounts) {
      allTimeCounts[row.status as keyof typeof allTimeCounts] = row.count;
      allTimeCounts.total += row.count;
    }

    // Daily signups for the period
    // Note: createdAt is stored in seconds (not milliseconds)
    const dailySignups = await db
      .select({
        date: sql<string>`DATE(${signups.createdAt}, 'unixepoch')`,
        count: count(),
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(sql`DATE(${signups.createdAt}, 'unixepoch')`)
      .orderBy(asc(sql`DATE(${signups.createdAt}, 'unixepoch')`));

    // Fill in missing dates with zeros (use UTC to avoid timezone issues)
    const filledDailySignups: { date: string; count: number; confirmed: number }[] = [];
    const dateMap = new Map(dailySignups.map(d => [d.date, { count: d.count, confirmed: d.confirmed }]));

    // Create a new date at UTC midnight for the start date
    const startDate = new Date(fromDateStr + 'T00:00:00Z');
    const endDate = new Date(toDateStr + 'T00:00:00Z');

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      filledDailySignups.push({
        date: dateStr,
        count: data?.count ?? 0,
        confirmed: data?.confirmed ?? 0,
      });
    }

    // Hourly distribution (what hours do signups happen)
    const hourlyDistribution = await db
      .select({
        hour: sql<number>`CAST(strftime('%H', ${signups.createdAt}, 'unixepoch') AS INTEGER)`,
        count: count(),
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(sql`strftime('%H', ${signups.createdAt}, 'unixepoch')`)
      .orderBy(asc(sql`strftime('%H', ${signups.createdAt}, 'unixepoch')`));

    // Source breakdown
    const sourceCounts = await db
      .select({
        source: signups.referralSource,
        count: count(),
        confirmed: sql<number>`SUM(CASE WHEN ${signups.status} IN ('confirmed', 'invited') THEN 1 ELSE 0 END)`,
      })
      .from(signups)
      .where(and(...currentConditions))
      .groupBy(signups.referralSource)
      .orderBy(desc(count()));

    // Today's signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);
    const [todayResult] = await db
      .select({ count: count() })
      .from(signups)
      .where(and(eq(signups.waitlistId, id), sql`${signups.createdAt} >= ${todayTimestamp}`));

    // Calculate rates and changes
    const currentConfirmationRate = currentCounts.total > 0
      ? Math.round(((currentCounts.confirmed + currentCounts.invited) / currentCounts.total) * 100)
      : 0;

    const previousConfirmationRate = previousCounts.total > 0
      ? Math.round(((previousCounts.confirmed + previousCounts.invited) / previousCounts.total) * 100)
      : 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return c.json({
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      counts: {
        current: currentCounts,
        previous: previousCounts,
        allTime: allTimeCounts,
        change: {
          total: calculateChange(currentCounts.total, previousCounts.total),
          confirmed: calculateChange(currentCounts.confirmed + currentCounts.invited, previousCounts.confirmed + previousCounts.invited),
        },
      },
      todaySignups: todayResult?.count || 0,
      confirmationRate: {
        current: currentConfirmationRate,
        previous: previousConfirmationRate,
        change: currentConfirmationRate - previousConfirmationRate,
      },
      dailySignups: filledDailySignups,
      hourlyDistribution: hourlyDistribution.map(h => ({ hour: h.hour, count: h.count })),
      sources: sourceCounts.map((s) => ({
        source: s.source || "direct",
        count: s.count,
        confirmed: s.confirmed,
        rate: s.count > 0 ? Math.round((s.confirmed / s.count) * 100) : 0,
      })),
    });
  })

  // Email Preview
  .get("/waitlists/:id/emails/:template/preview", async (c) => {
    const { id, template } = c.req.param();
    const db = createDb(c.env.DB);

    const waitlist = await db.query.waitlists.findFirst({
      where: eq(waitlists.id, id),
    });

    if (!waitlist) {
      throw Errors.WaitlistNotFound();
    }

    const validTemplates = ["confirmation", "welcome", "admin-notification"];
    if (!validTemplates.includes(template)) {
      throw Errors.NotFound("Email template");
    }

    const email = c.req.query("email") || "test@example.com";
    const position = parseInt(c.req.query("position") || "47");

    const html = await renderEmailPreview(
      template as "confirmation" | "welcome" | "admin-notification",
      waitlist,
      { email, position },
      getBaseUrl(c)
    );

    c.header("Content-Type", "text/html");
    return c.body(html);
  });

export default adminRoutes;
export type AdminRoutes = typeof adminRoutes;
