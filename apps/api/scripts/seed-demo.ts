/**
 * Seed script for demo mode - generates realistic data for 3+ months
 * Run with: bun run seed:demo (local) or bun run seed:demo:remote (production)
 */

// Configuration
const MONTHS_OF_DATA = 4;
const START_DATE = new Date();
START_DATE.setMonth(START_DATE.getMonth() - MONTHS_OF_DATA);

// Demo waitlists
const WAITLISTS = [
  {
    name: "Acme AI Assistant",
    slug: "acme-ai",
    primaryColor: "#6366f1",
    doubleOptIn: true,
    customFields: [
      { key: "company", label: "Company", type: "text", required: false },
      { key: "role", label: "Your Role", type: "text", required: false },
    ],
  },
  {
    name: "CloudSync Pro",
    slug: "cloudsync",
    primaryColor: "#10b981",
    doubleOptIn: true,
    customFields: [
      { key: "usecase", label: "Primary Use Case", type: "textarea", required: true },
    ],
  },
  {
    name: "DevTools Beta",
    slug: "devtools-beta",
    primaryColor: "#f59e0b",
    doubleOptIn: false,
    customFields: [],
  },
  {
    name: "Startup Weekend NYC",
    slug: "startup-weekend-nyc",
    primaryColor: "#ec4899",
    doubleOptIn: true,
    customFields: [
      { key: "linkedin", label: "LinkedIn Profile", type: "text", required: false },
      { key: "idea", label: "Startup Idea (optional)", type: "textarea", required: false },
    ],
  },
  {
    name: "Fitness App Early Access",
    slug: "fitapp",
    primaryColor: "#ef4444",
    doubleOptIn: false,
    customFields: [
      { key: "goal", label: "Fitness Goal", type: "text", required: true },
    ],
  },
];

// Referral sources with weighted probability
const REFERRAL_SOURCES = [
  { source: "twitter", weight: 25 },
  { source: "producthunt", weight: 15 },
  { source: "google", weight: 20 },
  { source: "linkedin", weight: 10 },
  { source: "reddit", weight: 8 },
  { source: "hackernews", weight: 7 },
  { source: "friend", weight: 10 },
  { source: null, weight: 5 }, // direct/unknown
];

// Email domain patterns
const EMAIL_DOMAINS = [
  { domain: "gmail.com", weight: 40 },
  { domain: "yahoo.com", weight: 10 },
  { domain: "hotmail.com", weight: 8 },
  { domain: "outlook.com", weight: 12 },
  { domain: "icloud.com", weight: 5 },
  { domain: "protonmail.com", weight: 5 },
  { domain: "company.com", weight: 10 },
  { domain: "startup.io", weight: 5 },
  { domain: "dev.to", weight: 5 },
];

// First names for generating emails
const FIRST_NAMES = [
  "alex", "jordan", "taylor", "morgan", "casey", "riley", "jamie", "drew",
  "sam", "quinn", "avery", "blake", "cameron", "dakota", "emery", "finley",
  "harper", "hayden", "jesse", "kai", "kendall", "logan", "maddox", "nico",
  "parker", "peyton", "reese", "river", "rowan", "sage", "sawyer", "skyler",
  "spencer", "sydney", "teagan", "devon", "ellis", "frankie", "gray", "indigo",
  "james", "lee", "max", "oliver", "emma", "sophia", "liam", "noah",
  "ava", "isabella", "mia", "charlotte", "amelia", "luna", "ella", "ellie",
];

// Companies for custom data
const COMPANIES = [
  "Stripe", "Vercel", "Figma", "Notion", "Linear", "Raycast", "Arc",
  "Supabase", "PlanetScale", "Railway", "Fly.io", "Render", "Neon",
  "Resend", "Clerk", "Auth0", "WorkOS", "Propel", "Statsig", "LaunchDarkly",
  "Freelance", "Startup", "Agency", "Enterprise Co", "Tech Corp",
];

const ROLES = [
  "Software Engineer", "Product Manager", "Designer", "Founder", "CTO",
  "Engineering Manager", "DevOps Engineer", "Full Stack Developer",
  "Frontend Developer", "Backend Developer", "Data Scientist", "ML Engineer",
  "Growth Lead", "Marketing Manager", "CEO", "VP Engineering",
];

const USE_CASES = [
  "Team collaboration and file sharing",
  "Personal cloud backup",
  "Development workflow sync",
  "Cross-device file access",
  "Enterprise document management",
  "Media storage and streaming",
];

const FITNESS_GOALS = [
  "Lose weight", "Build muscle", "Improve cardio", "Train for marathon",
  "Get stronger", "Better flexibility", "General fitness", "Sports training",
];

// Helper functions
function weightedRandom<T>(items: { weight: number }[] & T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(): string {
  const firstName = randomElement(FIRST_NAMES);
  const domain = weightedRandom(EMAIL_DOMAINS).domain;
  const suffix = Math.random() > 0.6 ? randomInt(1, 999) : "";
  return `${firstName}${suffix}@${domain}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate signup pattern - more signups on launch days, weekdays, etc.
function getSignupsForDay(dayIndex: number, totalDays: number, waitlistIndex: number): number {
  const baseSignups = randomInt(2, 8);

  // Launch spike in first few days
  const launchBonus = dayIndex < 7 ? randomInt(10, 30) : 0;

  // Occasional viral spikes
  const viralSpike = Math.random() < 0.02 ? randomInt(20, 50) : 0;

  // Weekend dip
  const date = new Date(START_DATE);
  date.setDate(date.getDate() + dayIndex);
  const dayOfWeek = date.getDay();
  const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.5 : 1;

  // Different waitlists have different popularity
  const popularityMultiplier = [2, 1.5, 1, 0.8, 0.6][waitlistIndex] || 1;

  return Math.round((baseSignups + launchBonus + viralSpike) * weekendMultiplier * popularityMultiplier);
}

// Generate custom data based on waitlist type
function generateCustomData(waitlist: typeof WAITLISTS[number]): Record<string, string> {
  const data: Record<string, string> = {};

  for (const field of waitlist.customFields) {
    if (field.key === "company" && Math.random() > 0.3) {
      data.company = randomElement(COMPANIES);
    } else if (field.key === "role" && Math.random() > 0.4) {
      data.role = randomElement(ROLES);
    } else if (field.key === "usecase") {
      data.usecase = randomElement(USE_CASES);
    } else if (field.key === "goal") {
      data.goal = randomElement(FITNESS_GOALS);
    } else if (field.key === "linkedin" && Math.random() > 0.6) {
      data.linkedin = `https://linkedin.com/in/${randomElement(FIRST_NAMES)}${randomInt(100, 9999)}`;
    } else if (field.key === "idea" && Math.random() > 0.7) {
      data.idea = "An app that helps people " + randomElement([
        "track their habits",
        "learn new skills",
        "connect with mentors",
        "manage their finances",
        "improve productivity",
      ]);
    }
  }

  return data;
}

// Main seed function - generates SQL statements
function generateSeedSQL(): string {
  const statements: string[] = [];
  const now = new Date();
  const totalDays = Math.ceil((now.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));

  // Clear existing data
  statements.push("DELETE FROM signups;");
  statements.push("DELETE FROM waitlists;");

  // Track used emails per waitlist to avoid duplicates
  const usedEmails = new Map<string, Set<string>>();

  for (let wIndex = 0; wIndex < WAITLISTS.length; wIndex++) {
    const waitlist = WAITLISTS[wIndex];
    const waitlistId = generateUUID();
    usedEmails.set(waitlistId, new Set());

    // Stagger waitlist creation dates
    const waitlistCreatedAt = new Date(START_DATE);
    waitlistCreatedAt.setDate(waitlistCreatedAt.getDate() + wIndex * randomInt(3, 10));

    // Insert waitlist
    statements.push(`
INSERT INTO waitlists (id, name, slug, primary_color, double_opt_in, custom_fields, allowed_origins, created_at, updated_at)
VALUES (
  '${waitlistId}',
  '${waitlist.name}',
  '${waitlist.slug}',
  '${waitlist.primaryColor}',
  ${waitlist.doubleOptIn ? 1 : 0},
  '${JSON.stringify(waitlist.customFields)}',
  '[]',
  ${Math.floor(waitlistCreatedAt.getTime() / 1000)},
  ${Math.floor(waitlistCreatedAt.getTime() / 1000)}
);`);

    // Generate signups for each day
    let position = 1;
    const waitlistStartDay = Math.floor((waitlistCreatedAt.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));

    for (let day = waitlistStartDay; day < totalDays; day++) {
      const signupsToday = getSignupsForDay(day - waitlistStartDay, totalDays - waitlistStartDay, wIndex);

      for (let s = 0; s < signupsToday; s++) {
        // Generate unique email
        let email: string;
        let attempts = 0;
        do {
          email = generateEmail();
          attempts++;
        } while (usedEmails.get(waitlistId)!.has(email) && attempts < 100);

        if (attempts >= 100) continue;
        usedEmails.get(waitlistId)!.add(email);

        const signupId = generateUUID();
        const signupDate = new Date(START_DATE);
        signupDate.setDate(signupDate.getDate() + day);
        signupDate.setHours(randomInt(6, 23), randomInt(0, 59), randomInt(0, 59));

        // Determine status - older signups more likely to be confirmed
        const daysSinceSignup = totalDays - day;
        const confirmationProbability = waitlist.doubleOptIn
          ? Math.min(0.85, daysSinceSignup / 10)
          : 1;
        const isConfirmed = Math.random() < confirmationProbability;
        const status = isConfirmed ? "confirmed" : "pending";

        // Confirmed date (usually within 24 hours of signup for confirmed)
        const confirmedAt = isConfirmed
          ? new Date(signupDate.getTime() + randomInt(60, 86400) * 1000)
          : null;

        const referralSource = weightedRandom(REFERRAL_SOURCES).source;
        const customData = generateCustomData(waitlist);

        statements.push(`
INSERT INTO signups (id, waitlist_id, email, position, status, custom_data, referral_source, created_at, confirmed_at)
VALUES (
  '${signupId}',
  '${waitlistId}',
  '${email}',
  ${position},
  '${status}',
  '${JSON.stringify(customData)}',
  ${referralSource ? `'${referralSource}'` : "NULL"},
  ${Math.floor(signupDate.getTime() / 1000)},
  ${confirmedAt ? Math.floor(confirmedAt.getTime() / 1000) : "NULL"}
);`);

        position++;
      }
    }
  }

  return statements.join("\n");
}

// Generate and output SQL
const sql = generateSeedSQL();
console.log(sql);
