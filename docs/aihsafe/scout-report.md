# AIH Safe — Scout Report
**Agent 0 / Architect pass · famtree repo · 2026-05-09**

---

## Repo Convention

| Item | Value |
|---|---|
| Framework | Next.js 14 (App Router) |
| Runtime | Node 18+ / Vercel Edge (middleware only) |
| DB ORM | Prisma 5 / PostgreSQL (Neon) |
| Auth | jose JWT + server-side session table |
| Validation | Zod 3 |
| Email | Resend |
| Storage | Vercel Blob (prod) / local disk (dev) |
| Package manager | npm |
| Language | TypeScript (strict) |

**No `/src` directory.** All source lives at repo root:
`app/` · `lib/` · `types/` · `components/` · `prisma/`

All AIH Safe scaffold has been adapted to match this convention.

---

## 1 · Auth Surfaces

| Surface | Location |
|---|---|
| Login page | `app/(auth)/login/page.tsx` |
| Register page | `app/(auth)/register/page.tsx` |
| Reset password | `app/(auth)/reset-password/page.tsx` |
| Auth API | `app/api/auth/` (login, register, logout, me, change-password, forgot-password, reset-password, clear-stale-session) |
| Session cookie | `lib/auth/session-cookie.ts` — cookie name `AMIHUMAN.NET_session` |
| JWT | `lib/auth/index.ts` — HS256 via `jose`, 7-day expiry |
| Session DB table | `Session` model in `prisma/schema.prisma` |
| Edge middleware | `middleware.ts` — protects `/dashboard`, `/profile`, `/tree`, `/settings`, `/admin`, `/family-vault`, `/invite` (exact) |
| `getCurrentUser()` | `lib/auth/index.ts` — validates cookie → DB session → `status === "active"` |
| `requireAuth()` | `lib/auth/index.ts` — throws 401 if not authenticated |

**AIH Safe note:** No age-aware auth gating exists. No parental consent flow exists. No guardian-delegated session concept exists. These are net-new.

---

## 2 · User / Profile Surfaces

| Surface | Location |
|---|---|
| `User` model | `prisma/schema.prisma` — id, email, passwordHash, firstName, lastName, dateOfBirth, photoUrl, role, status, relationship, invitedById |
| `Profile` model | `prisma/schema.prisma` — bio, familyRole, location, coverUrl, isPublicInTree, showDob |
| Profile API | `app/api/profile/` (GET/PATCH profile, photo, cover, photos, posts) |
| Members API | `app/api/members/` (list, get by userId) |
| Safe types | `types/index.ts` — `SafeUser`, `ProfileWithUser`, `FamilyRole` |

**Existing `User.role` values:** `"founder"` · `"admin"` · `"member"` (string, not enum)

**Existing `User.relationship` values:** `"parent"` · `"child"` · `"sibling"` · `"spouse"` · `"so"` · `"frnd"` · `"other"` (string, set at invite time)

**Existing `Profile.familyRole` values:** `"parent"` · `"grandparent"` · `"sibling"` · `"cousin"` · `"child"` · `"other"` (string)

**AIH Safe note:** No age tier field exists. `dateOfBirth` exists on `User` but is not used for gating. No formal `ChildProfile` model exists. No guardian designation model exists.

---

## 3 · Onboarding Surfaces

| Surface | Location |
|---|---|
| Register flow | `app/(auth)/register/page.tsx` + `app/api/auth/register/route.ts` |
| Invite gate | `app/invite/[token]/page.tsx` (public identity challenge) |
| Dashboard prompt | `components/dashboard/ProfileCompletionPrompt.tsx` |
| Prompt dismiss API | `app/api/dashboard/profile-prompt/dismiss/route.ts` |

**AIH Safe note:** No parental-consent onboarding step. No age verification. No child account setup wizard. All net-new.

---

## 4 · Invite Surfaces

| Surface | Location |
|---|---|
| `Invite` model | `prisma/schema.prisma` — token, senderId, recipientEmail, status, relationship, expiresAt, attempts |
| `InviteStatus` enum | `PENDING → ACCEPTED → REGISTERED \| EXPIRED \| CANCELLED` |
| Send invite page | `app/(app)/invite/page.tsx` |
| Identity challenge | `app/invite/[token]/page.tsx` (public) |
| Invite API | `app/api/invite/` (POST, GET/POST [token], lookup, manage/[id]) |
| Invite lib | `lib/invite/index.ts` (verifyIdentityChallenge, fuzzy match via Fuse.js) |
| Trust unit invite | `TrustUnitRequestPendingInvite` model — links invite to TU request |

**AIH Safe note:** Existing invite is adult-to-adult. No guardian-permissioned child invite flow. No age-restricted invite paths. AIH Safe invite service (`lib/aihsafe/invites/`) will wrap — not replace — the existing system.

---

## 5 · API Routes (full inventory)

```
app/api/auth/           login · register · logout · me · change-password · forgot-password · reset-password · clear-stale-session
app/api/admin/          activity · announcement · members · members/password-reset · identity-changes · identity-changes/[id] · identity-change/unlock · link-parent · message · db-sanity
app/api/announcement/   current · [id]/view
app/api/concierge/      chat · session · lead · takeover
app/api/invite/         POST(send) · [token](GET/POST) · lookup · manage/[id]
app/api/members/        GET(list) · [userId](GET)
app/api/profile/        GET/PATCH · photo · cover · photos · posts
app/api/trust/          create-request · respond · check-opportunity
app/api/connections/    create-request
app/api/identity-change/ POST · incoming · [id]/ack · [id]/withdraw
app/api/posts/          [postId]/likes · [postId]/comments
app/api/dashboard/      profile-prompt/dismiss
app/api/tree/           view-preference
app/api/users/          lookup-by-email
app/api/waitlist/       POST
app/api/openapi/        GET
```

**AIH Safe API namespace:** `app/api/aihsafe/` — reserved, not yet created.

---

## 6 · Database / Service Clients

| Client | Location |
|---|---|
| Prisma singleton | `lib/db/prisma.ts` |
| DB host hint | `lib/db/databaseHostHint.ts` |
| Storage (Blob/S3) | `lib/storage/index.ts` |
| Email (Resend) | `lib/email/index.ts` |
| Activity log | `lib/activity/log.ts` |
| Auth | `lib/auth/index.ts` |

---

## 7 · Shared Types

| File | Contents |
|---|---|
| `types/index.ts` | `FamilyRole`, `SafeUser`, `ProfileWithUser`, `PostData`, `PhotoData` |
| `types/studios.ts` | Studio-related types |
| `types/fuzz-openapi-shims.d.ts` | Fuzzing shims |

**AIH Safe types namespace:** `types/aihsafe/` — created by this scaffold.

---

## 8 · Validation / Schema Tools

- **Zod** (`zod` + `zod-form-data`) — used throughout API route handlers for request body validation
- **Fuse.js** — fuzzy matching in identity challenge
- **Prisma** — schema-first DB validation

No dedicated schema directory exists. AIH Safe schemas will live in `lib/aihsafe/` as Zod schemas (not yet created — deferred to Agent 1+).

---

## 9 · Build / Lint / Test Tooling

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `prisma generate && next build` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `next lint` (ESLint) |
| `db:push` | `prisma db push` |
| `db:generate` | `prisma generate` |
| `db:studio` | `prisma studio` |
| `db:seed` | `tsx prisma/seed.ts` |

No unit test runner configured. No Vitest/Jest setup. No Playwright/Cypress config.

---

## 10 · Naming Collision Risks

| AIH Safe Concept | Existing Collider | Risk | Resolution |
|---|---|---|---|
| `TrustUnit` | `TrustUnit` Prisma model (3-person group) | High | AIH Safe `TrustUnit` type extends/narrows the existing model. See `types/aihsafe/trust-units.ts`. |
| `Invite` | `Invite` Prisma model + `InviteStatus` enum | Medium | AIH Safe invite states mirror existing. `lib/aihsafe/invites/` wraps, does not replace. |
| `AuditEvent` | `ActivityLog` Prisma model | Low | `ActivityLog` is admin-only, untyped string. AIH Safe audit is a typed event system layered on top. |
| `Role` | `User.role` string field | Low | AIH Safe `roles.ts` defines typed roles that map to existing string values. |
| `Visibility` | `PostVisibility` model + `Profile.isPublicInTree` | Low | AIH Safe visibility is a superset scope system. Existing fields remain. |
