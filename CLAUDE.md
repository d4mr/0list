# Claude Code Conventions

This is a full-stack waitlist management application with a Hono backend (Cloudflare Workers) and React frontend.

## Project Structure

```
/
├── src/                    # Backend (Hono + Cloudflare Workers)
│   ├── api/               # Route handlers
│   │   ├── admin.ts       # Admin API routes (authenticated)
│   │   └── public.ts      # Public API routes (signup, confirm)
│   ├── db/                # Database (Drizzle ORM + D1)
│   │   ├── schema.ts      # Table definitions
│   │   └── index.ts       # DB client
│   ├── middleware/        # Hono middleware
│   │   ├── auth.ts        # CF Access JWT verification
│   │   └── rate-limit.ts  # Rate limiting
│   ├── emails/            # Email templates (Resend)
│   ├── lib/               # Utilities
│   │   ├── errors.ts      # Error classes
│   │   └── utils.ts       # Helper functions
│   └── bindings.ts        # TypeScript types for env/context
├── web/                    # Frontend (React + Vite)
│   └── CLAUDE.md          # Frontend-specific conventions (READ THIS)
└── wrangler.toml          # Cloudflare Workers config
```

**See `web/CLAUDE.md` for detailed frontend conventions.**

---

## Backend Conventions

### Error Handling

Use the `Errors` factory for consistent error responses:

```typescript
import { Errors } from "../lib/errors";

// Throw errors - they'll be caught by error middleware
throw Errors.NotFound("Waitlist");
throw Errors.ValidationError("Invalid email format");
throw Errors.AlreadySignedUp();
throw Errors.RateLimited();
```

**Never create raw HTTPException** - use the factory:

```typescript
// WRONG
throw new HTTPException(404, { message: "Not found" });

// CORRECT
throw Errors.NotFound("Resource");
```

### API Response Format

Success responses:
```typescript
return c.json({ waitlist, signups });
return c.json({ success: true, message: "Signup confirmed" });
```

Error responses (automatic via AppError.toJSON):
```json
{
  "error": {
    "code": "WAITLIST_NOT_FOUND",
    "message": "Waitlist not found"
  }
}
```

### Route Handler Pattern

```typescript
import { Hono } from "hono";
import type { Env, Variables } from "../bindings";
import { Errors } from "../lib/errors";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb(c.env.DB);

  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
  });

  if (!item) {
    throw Errors.NotFound("Item");
  }

  return c.json({ item });
});

export default app;
```

### Database Queries (Drizzle)

```typescript
import { getDb } from "../db";
import { waitlists, signups } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

// Simple query
const waitlist = await db.query.waitlists.findFirst({
  where: eq(waitlists.slug, slug),
});

// Insert with returning
const [signup] = await db
  .insert(signups)
  .values({ waitlistId, email, position })
  .returning();

// Update
await db
  .update(signups)
  .set({ status: "confirmed", confirmedAt: new Date() })
  .where(eq(signups.id, signupId));
```

### Authentication Check

Admin routes require authentication:
```typescript
import { requireAuth, getUser } from "../middleware/auth";

app.use("/*", requireAuth);

app.get("/me", (c) => {
  const user = getUser(c);
  return c.json({ user });
});
```

### Environment Variables

Access via `c.env`:
```typescript
const resendKey = c.env.RESEND_API_KEY;
const db = c.env.DB; // D1 binding
```

---

## Type Patterns

### Bindings Type
```typescript
// src/bindings.ts
export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

export interface Variables {
  user?: AccessUser;
}
```

### Shared Types

Backend types are imported by frontend:
```typescript
// Frontend imports backend types
import type { Waitlist, Signup } from "../../../src/db/schema";
```

---

## Do NOT

- Create raw HTTPException - use `Errors` factory
- Expose internal error details to users
- Skip input validation
- Use any type - always type context properly
- Forget to handle missing resources (always check and throw NotFound)
