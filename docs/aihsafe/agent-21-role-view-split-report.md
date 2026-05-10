# Agent 21 — Founder / Member Role View Split

**Branch:** `aihsafe-agent-21-role-view-split`  
**Date:** 2026-05-10  
**Scope:** Presentation-only split of `/aihsafe` using existing `ActorContext` and `FounderShell`. No new APIs, no Prisma/schema/auth/governance logic changes.

---

## 1. Files created

| File | Purpose |
|------|---------|
| `components/aihsafe/roles/RoleAwareFamilySafePage.tsx` | Server-side `deriveSafeRoleView` + routes to Founder/Member/Child client views |
| `components/aihsafe/roles/FounderView.tsx` | Founder steward presentation (`shellMode="founder"` + banner) |
| `components/aihsafe/roles/MemberView.tsx` | Adult participant presentation (`shellMode="member"` + banner) |
| `components/aihsafe/roles/ChildView.tsx` | Minor presentation (`shellMode="child"` + banner + feed preface) |
| `components/aihsafe/roles/RoleBanner.tsx` | Contextual one-line copy under hero |

---

## 2. Files modified

| File | Change |
|------|--------|
| `app/(app)/aihsafe/page.tsx` | `buildActorContext` → `RoleAwareFamilySafePage` |
| `components/aihsafe/founder/FounderShell.tsx` | `shellMode`, `belowHero`, `feedPreface`; conditional panels; read-only spaces list for minors; optional `MembershipPanel` for member/child |
| `components/aihsafe/feed/ActivityFeed.tsx` | Optional `viewerMode` passed to composer |
| `components/aihsafe/feed/PostComposer.tsx` | Optional `viewerMode`; softer no-space + denial suffix copy for `child` |

---

## 3. Role mapping logic

Implemented in `deriveSafeRoleView(actor)`:

1. **`child`** if `isMinorTier(actor.ageTier)` → `AgeTier.CHILD`, `PRETEEN`, or `TEEN`.
2. **`founder`** else if `actor.systemRole` is `FOUNDER` or `ADMIN`, **or** `actor.familySafeRole === GUARDIAN` (active guardian rows per `deriveFamilySafeRole`).
3. **`member`** otherwise — typically adults without guardian designation.

Trust-unit creator / space ownership is **not** on `ActorContext`; we do not infer steward UI from graph ownership alone.

---

## 4. Founder view behavior

- Same structural shell as before: full hero stats, **Pending attention**, activity feed, **Governance overview**, **Family health**, **Quick actions**, **Trusted extensions**, **Governance settings preview**, **FamilySnapshot** + **SpacesSnapshot**.
- **RoleBanner:** “You are stewarding this family network.”

---

## 5. Member view behavior

- Calmer hero copy (“Your trusted family spaces” / “Share with the people who actually know you.”).
- **Pending attention**, feed (“Your activity”), governance overview + family health, quick actions, snapshots.
- **No** Trusted extensions panel, **no** governance settings preview.
- **Membership controls** (`MembershipPanel`) in sidebar.
- **RoleBanner:** “You are participating in trusted spaces.”

---

## 6. Child / teen view behavior

- Belonging-first hero (“Your safe family space” / “Share updates with your trusted circles.”).
- Hero stats reduced to **spaces you're in** + **people in those circles**.
- **No** pending-attention strip, **no** governance overview/health, **no** quick-action create buttons (replaced by gentle “ask a trusted adult” card).
- Feed scoped to **memberships only** for picker + **RoleBanner** + feed preface about guardian review.
- **Read-only** spaces list (no “+ New”).
- **MembershipPanel** retained for participation controls (server still governs exits).
- **PostComposer** child copy for empty spaces + denial suffix (“A guardian will review…”).
- **RoleBanner:** “You are sharing inside approved circles.”

---

## 7. Known limitations

- **UI ≠ authorization:** All writes still go through existing routes; hiding panels does not remove server-side checks.
- **`AgeTier.UNKNOWN`:** Treated as **adult** for tier checks (not in `MINOR_TIERS`); DOB should be set for accurate minor routing.
- **Steward detection:** Uses **system role + guardian relationships** only — not “created this trust unit” metadata (not on `ActorContext`).
- **`npm run build`** may fail on Windows with Prisma `EPERM` rename on `query_engine-windows.dll.node`; **`npx next build`** succeeded after generate was already present.

---

## 8. Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Failed here (Prisma EPERM on Windows) |
| `npx next build` | Pass |

---

## 9. Next recommended step

- Merge after QA with real accounts: founder, guardian adult, plain adult member, teen/child with DOB set.
- Optionally add lightweight analytics (privacy-preserving) on which `deriveSafeRoleView` branch renders — **without** logging child identity in clear text.
- If product requires “space owner” steward UI without guardian role, extend **`ActorContext`** in a future agent (schema/context builder change), not in presentation-only PR.
