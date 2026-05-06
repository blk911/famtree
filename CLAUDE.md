# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev            # Start dev server (port 3000, falls back to 3001)
npm run build          # local: prisma generate + next build (Vercel runs db push first — see vercel.json)
npm run lint           # next lint

npm run db:push        # Push schema changes to DB (no migration files — schema-first)
npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:studio      # Open Prisma Studio GUI
npm run db:seed        # Seed a founder account (founder@famtree.test / password123)
```

**Critical dev workflow:** After any `prisma/schema.prisma` change, run `db:push` then `db:generate`, then **restart the dev server** — Next.js hot-reload does not pick up Prisma client regeneration.

**Production DB push:** The repo has no migrations directory. To push schema to the Neon production DB, temporarily set `DATABASE_URL` to the production connection string before running `db:push`.

---

## Architecture

### Route groups
- `app/(auth)/` — Unauthenticated pages: `/login`, `/register`
- `app/(app)/` — Authenticated shell (sidebar layout via `AppShell`): `/dashboard`, `/profile`, `/invite`, `/tree`, `/settings`, `/admin`
- `app/invite/[token]/` — Public identity challenge page (no auth required)
- `app/api/` — All API routes (Next.js Route Handlers)

### Auth & sessions
- Cookie name: `AMIHUMAN.NET_session` (defined in `lib/auth/session-cookie.ts`)
- JWT signed with `JWT_SECRET` using `jose` (HS256, 7-day expiry)
- Sessions are also stored in the `sessions` DB table for server-side revocation
- `getCurrentUser()` in `lib/auth/index.ts` — use this in every server component/route that needs the current user. It validates the cookie, checks the DB session, and enforces `status === "active"`
- `requireAuth()` — same but throws if unauthenticated
- Middleware at `middleware.ts` protects routes at the edge. Key rules:
  - `/invite` (exact) is protected; `/invite/[token]` is **public** (identity challenge)
  - `/register?token=...` bypasses the "redirect authenticated users" rule — lets an invitee register even if the sender is still logged in on that browser

### Invite & identity-gate flow
1. Sender fills `/invite` → `POST /api/invite` → creates `Invite` record, sends email via Resend
2. Invitee clicks link → `/invite/[token]` → `GET /api/invite/[token]` returns sender's photo (not name)
3. Invitee types sender's name → `POST /api/invite/[token]` → `verifyIdentityChallenge()` in `lib/invite/index.ts` fuzzy-matches using Fuse.js (threshold 0.35). 3 wrong attempts auto-expires the invite.
4. On success: invite status → `ACCEPTED`, redirect to `/register?token=...&email=...`
5. Registration: `POST /api/auth/register` verifies invite is `ACCEPTED` + email matches, creates user, stamps invite as `REGISTERED` (terminal state), sets `invitedById` on the new user

**Invite status lifecycle:** `PENDING` → `ACCEPTED` → `REGISTERED` (fully consumed) | `EXPIRED` | `CANCELLED`

### Tree structure
- Users have a durable `invitedById` FK (self-referential) set at registration time
- `buildTree()` in `dashboard/page.tsx` and `tree/page.tsx` uses `invitedById` as primary parent, falling back to invite record email-match for pre-migration rows
- Admin can repair orphan users (registered outside invite flow) via `PATCH /api/admin/link-parent`

### Roles
- `"founder"` — first registered user, has admin access
- `"admin"` — elevated access, same UI as founder
- `"member"` — standard user

### Storage
`lib/storage/index.ts` — dual-mode:
- **Dev:** writes to `public/uploads/{folder}/` (local disk)
- **Production:** uploads to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set

Photo upload inputs must **not** use `display:none` / `className="hidden"` — iOS Safari won't open the file picker. Use `position: absolute; left: -9999px; opacity: 0` with `<label htmlFor>` triggers instead.

### Email
`lib/email/index.ts` — all transactional email via Resend. Set `RESEND_API_KEY=re_skip` to disable email sending in dev (logs to console instead). The `FROM` address is `AMIHUMAN.NET <noreply@AMIHUMAN.NET.app>`.

### Styling conventions
- Tailwind utility classes for layout/spacing
- Inline `style={{}}` props for one-off values or component-level design tokens
- Responsive breakpoints live in `app/globals.css` as named CSS classes (`.app-sidebar`, `.invite-two-col`, `.admin-stats-grid`, etc.) — used when Tailwind `sm:` alone isn't enough
- Design language: stone/warm palette, `border-radius: 14–22px` cards, `boxShadow: 0 1px 4px rgba(0,0,0,0.05)`

### Key shared components
- `components/AppShell.tsx` — top nav + slide-in sidebar for the `(app)` layout
- `components/TreeList.tsx` — renders the flattened tree with depth/connector lines
- `components/admin/AdminLists.tsx` — members, invites, waitlist tables with actions (cancel/delete invite, link-parent modal)
- `components/PostCard.tsx` — timeline post card with likes/comments

### AIH Studios (templates)

- Creator flow: `/studios/start` → neutral template (`cloneNeutralStudioTemplate`) + optional `hydrateNormalizedStudioFromProfile` when logged in → `StudioEditor` (`TrainerStudioShell` `variant="start"`).
- **Roadmap / render ownership:** `docs/studio-templates.md` — neutral spine + fitness vertical; **admin preset lab** at `/admin/studios/template`.
- Source: `lib/studio/templates/neutral-studio-template.ts`, `lib/studio/templates/fitness-studio-template.ts`; legacy Deb-named re-export lives in `lib/studio/templates/deb-dazzle-template.ts`.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 64-char secret for signing session JWTs |
| `NEXT_PUBLIC_APP_URL` | Full public URL (used in email links) |
| `RESEND_API_KEY` | Resend API key; set to `re_skip` to skip email in dev |
| `EMAIL_FROM` | Sender address for transactional email |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token; absence triggers local-disk fallback |

---

## Known dev-only issues

- `lib/otel/register.ts` imports `@opentelemetry/sdk-node` which is not installed — this logs a warning on dev server start but does not affect functionality. `instrumentationHook` is disabled in `next.config.mjs`.
- The worktree at `.claude/worktrees/` is gitignored; never `git add -A` from the repo root or it will try to stage the worktree as a submodule.
