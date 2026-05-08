/** Short ops reference for admin Tools page — when / what / why / where only. */

export type OpsLine = {
  title: string;
  when: string;
  what: string;
  why: string;
  where: string;
};

/** Runnable CLI (npm) — never executed from the browser; doc for the next admin. */
export const ADMIN_SCRIPT_OPS: OpsLine[] = [
  {
    title: "bonds:scan",
    when: "After DB restore, invite churn, or bonds missing in Units / Private Feed.",
    what: "Prints JSON gaps between invites / invitedById vs connection_requests.",
    why: "Historical rows often lack ACCEPTED sponsor bonds while TU adjacency still sees edges.",
    where: "Repo root: `npm run bonds:scan` → `scripts/scan-sponsor-bonds.ts`.",
  },
  {
    title: "bonds:fix",
    when: "Only on environments you own; backup first if not dev.",
    what: "Upserts sponsor→member ACCEPTED connection rows for resolved gaps.",
    why: "Aligns Postgres with Family Units + Private Feed bond lists.",
    where: "Repo root: `npm run bonds:fix` (same script with `--fix`).",
  },
  {
    title: "typecheck",
    when: "Before PR / merge; optional CI gate.",
    what: "`tsc --noEmit` across the app.",
    why: "Catches broken Trust/TU imports without a full Next build.",
    where: "`npm run typecheck`",
  },
  {
    title: "Prisma generate / validate",
    when: "After pulling schema changes.",
    what: "Regenerates client + validates schema.",
    why: "Keeps runtime queries aligned with `prisma/schema.prisma`.",
    where: "`npx prisma generate` · `npx prisma validate`",
  },
];

/** Non-CLI pointers — APIs and docs. */
export const ADMIN_TOOL_OPS: OpsLine[] = [
  {
    title: "Tools & foundation (admin UI)",
    when: "Whenever you need script paths or deploy fingerprints without grep.",
    what: "SVC snapshot (versions, DB host, counts) plus SCRIPTS/TOOLS cards.",
    why: "One surface for the next admin; sidebar expands automatically on `/admin` and `/settings`.",
    where: "`/admin/tools` — Settings → **Tools & foundation** (founder/admin).",
  },
  {
    title: "DB sanity API",
    when: "Quick check that this deployment hits the intended Postgres.",
    what: "JSON: DB host fingerprint (no password), row counts, optional Vercel commit.",
    why: "Avoids “edited local .env” vs “production URL” confusion.",
    where: "GET `/api/admin/db-sanity` (admin session required).",
  },
  {
    title: "Bond / TU repair notes",
    when: "Debugging sponsor bonds, invite email drift, dashboard Units.",
    what: "Written incident-style checklist + verification steps.",
    why: "Onboards the next admin without repo archaeology.",
    where: "`docs/debug-repair-bonds-report.md`",
  },
  {
    title: "Code-only merge checklist",
    when: "Before merging recovery branches to main.",
    what: "PR safety rules; data vs code separation.",
    why: "Prevents shipping dev fixtures into production workflows.",
    where: "`docs/code-only-merge-checklist.md`",
  },
];
