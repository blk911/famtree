# AIH Safe — Bug List

Bugs discovered across Agents 8–12. Status reflects state at end of Agent 12.

---

## Fixed

### BUG-001 — `/aihsafe` page fails static rendering
**Severity:** Critical (build break)
**Discovered:** Agent 8
**Fixed:** Agent 8
**File:** `app/(app)/aihsafe/page.tsx`
**Detail:** `requireAuth()` reads cookies; Next.js requires opt-out of static rendering.
**Fix:** Added `export const dynamic = "force-dynamic"`

---

### BUG-002 — MembershipPanel silently drops 409 last-member conflict
**Severity:** High (user sees nothing on error)
**Discovered:** Agent 9
**Fixed:** Agent 9
**File:** `components/aihsafe/membership/MembershipPanel.tsx`
**Detail:** Component only handled `"ok"` and `"denied"` from `exitMembership`. The 409 conflict response (last member, cannot exit) returns `AihError` (no governance field), which fell through silently.
**Fix:** Added `errors` state map; render inline `role="alert"` paragraph per membership card.

---

### BUG-003 — DecisionNotice uses `role="status"` for governance denials
**Severity:** Medium (accessibility regression)
**Discovered:** Agent 9
**Fixed:** Agent 9
**File:** `components/aihsafe/common/DecisionNotice.tsx`
**Detail:** WCAG requires `role="alert"` for assertive notifications. A hard 403 denial was announced passively.
**Fix:** `role={isPending ? "status" : "alert"}`

---

### BUG-004 — Trust unit name never persisted (TrustUnit has no name column)
**Severity:** High (data loss)
**Discovered:** Agent 10
**Fixed:** Agent 11
**Files:** `prisma/schema.prisma`, `app/api/aihsafe/trust-units/route.ts`
**Detail:** Route spread `name` onto `TrustUnit` directly. `TrustUnit` has no name column; Prisma silently discarded the field. Name belonged on `AihTrustUnitMeta`.
**Fix:** Added `name String?` to `AihTrustUnitMeta` in schema + ran `db:push`. Moved name to `aihMeta.create` in the route.

---

### BUG-005 — `executeDeferredAction` loses trust unit name on guardian approval replay
**Severity:** High (data loss for teen actors)
**Discovered:** Agent 12
**Fixed:** Agent 12
**File:** `lib/aihsafe/approvals/executeDeferredAction.ts`
**Detail:** The `create_trust_unit` deferred case still had the old buggy spread (`...(name ? { name } : {})` on TrustUnit). When a teen creates a trust unit requiring guardian approval, the name is captured in `contextJson` but silently lost when the action replays after approval.
**Fix:** Removed TrustUnit spread; moved `name: name ?? null` into `aihMeta.create`.

---

### BUG-006 — TrustUnitCreatePanel "Your spaces" list ignores unit name
**Severity:** Low (UI inconsistency)
**Discovered:** Agent 12
**Fixed:** Agent 12
**File:** `components/aihsafe/trust-unit/TrustUnitCreatePanel.tsx`
**Detail:** `MembershipPanel` and `InvitePanel` both show `u.name` when present. The inline list in `TrustUnitCreatePanel` always showed `{u.kind} space`.
**Fix:** `{u.name ?? \`${u.kind} space\`}`

---

## Known — Not Bugs (Phase 4 Gaps)

| Item | Detail |
|---|---|
| `TrustUnitMember` has no `role` or `exitedAt` column | Hard delete used for exit; promote/demote returns 422. Planned for Phase 4. |
| `Invite` model has no `trustUnitId` / `familyUnitId` column | DTO returns null for these. Planned for future. |
| `canCreateTrustUnit` uses `AuditEventKind.FAMILY_UNIT_CREATED` internally | Minor inconsistency; routes emit their own event kinds so no observable impact. |
| `lib/aihsafe/invites/index.ts` functions all throw "Not implemented" | Stub from Agent 1. Routes bypass this file and call Prisma directly. Not a runtime issue. |
