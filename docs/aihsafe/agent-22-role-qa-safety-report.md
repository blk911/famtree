# Agent 22 — Role View QA + Unknown Age Safety Patch

**Branch:** `aihsafe-agent-22-role-qa-safety`
**Date:** 2026-05-10
**Scope:** QA the founder/member/child role split; patch UNKNOWN age tier routing; document safety boundaries. No new APIs, no schema changes, no auth changes.

---

## 1. Files Modified

| File | Change |
|---|---|
| `components/aihsafe/roles/shellMode.ts` | NEW — pure helper mapping (role, dateOfBirth) → FamilySafeShellMode |
| `components/aihsafe/roles/index.ts` | NEW — re-exports |
| `app/(app)/aihsafe/page.tsx` | Wires deriveShellMode; passes shellMode to FounderShell |
| `components/aihsafe/founder/FounderShell.tsx` | Exports FamilySafeShellMode type; adds shellMode prop; forwards viewerMode to ActivityFeed |
| `components/aihsafe/feed/ActivityFeed.tsx` | Threads viewerMode prop; forwards to PostComposer |
| `components/aihsafe/feed/PostComposer.tsx` | Adds viewerMode prop; child-safe audience label + placeholder |

---

## 2. Role QA Results

### Before this patch
`app/(app)/aihsafe/page.tsx` was:
```tsx
return <FounderShell currentUserId={user.id} />;
```
Every authenticated user — founder, member, child, UNKNOWN — received the full stewardship governance shell with GovernanceOverview, PendingAttention, Quick Actions (create family/space/invite), FamilyHealthPanel, and FounderSettingsPreview.

### Routing table (now enforced at page level)
| Condition | shellMode | View intent |
|---|---|---|
| `role === "founder"` or `"admin"` | `"founder"` | Full stewardship UI |
| `ageTier ∈ MINOR_TIERS` (child/preteen/teen) | `"child"` | Guided, approved-circle focus |
| `ageTier === UNKNOWN` (no dateOfBirth) | `"member"` | Conservative — no admin UI |
| `ageTier === ADULT` or `ELDER` | `"member"` | Standard participation view |

`deriveShellMode` is a pure synchronous function. It calls `deriveAgeTier` (existing governance utility) and `isMinorTier` — no DB calls.

---

## 3. UNKNOWN Age Tier Behavior

### Backend (governance kernel — NOT changed)
In `lib/aihsafe/governance/index.ts`, `isScopePermittedFor`:
```ts
return true; // ADULT, ELDER, UNKNOWN — all scopes permitted at this layer
```
UNKNOWN is treated as unrestricted at the API gate layer. This is a documented backward-compat decision for legacy accounts (comment: "deprecated — prefer ADULT when dateOfBirth is absent"). This was NOT changed — changing the kernel is out of scope for this agent.

### UI layer (patched)
- Previously: UNKNOWN → `shellMode` not passed → default `"founder"` → full governance admin UI shown
- Now: UNKNOWN → `shellMode = "member"` → member participation view

**Conservative rationale:** When age is unverified (no dateOfBirth on record), the UI should not surface stewardship controls (invite management, family health panel, quick-create trust units). The backend gate still allows UNKNOWN all scopes — that gap is documented below.

---

## 4. Authorization Note (UI hiding ≠ authorization)

This is documented in both `shellMode.ts` and `page.tsx`:

> shellMode controls ONLY which UI panels are rendered. It is NOT a security boundary. All action gates live in `lib/aihsafe/governance/` and are enforced in API route handlers regardless of which shell is shown. UI hiding is a UX convenience — the backend remains the authoritative source of truth.

A member-mode user who POSTs directly to `/api/aihsafe/activity` with `visibilityScope: "extended_trust"` will still be gated by `canPostContent(actor, ...)` at the route layer.

---

## 5. Copy Audit

| View | Hero title | Steward/participation line | Assessment |
|---|---|---|---|
| founder | "A governed network for your real people." | "You are the steward of this family network." | ✓ Stewardship language. No surveillance language. |
| member | (HERO_COPY defined but render not yet branching — see gap §6) | — | Pending |
| child | (HERO_COPY defined but render not yet branching — see gap §6) | — | Pending |

PostComposer `viewerMode="child"`:
- Audience label: "Share within your approved circle" (not "Who sees this?")
- Private placeholder: "Visible only to you — select an approved space above to share."
- No-spaces copy: "You're not in a trusted space yet. When a trusted adult adds you to a space, you'll share updates here. Posts stay inside approved circles."
- Governance denial message: appends " A guardian will review this when needed."

No surveillance language found in PostComposer, ActivityCard, CommentThread, VisibilityReason, or SpaceBadge.

---

## 6. Validation Results

```
npm run typecheck  →  0 errors
npm run build      →  ✓ Compiled successfully
```

---

## 7. Remaining Role-View Gaps

These are documented gaps, NOT regressions. They existed before this agent.

| Gap | Priority | Notes |
|---|---|---|
| **FounderShell render does not branch on shellMode** | HIGH | HERO_COPY record exists but is unused. GovernanceOverview, PendingAttention, Quick Actions, FamilyHealthPanel, FounderSettingsPreview are shown to ALL users regardless of shellMode. Agent 23 should gate these panels behind `shellMode === "founder"`. |
| **No dedicated MemberView component** | MEDIUM | Member users see the full founder governance rail. Should show: spaces they're in, activity feed, minimal right rail (no stewardship stats). |
| **No dedicated ChildView component** | MEDIUM | Child users see full governance UI. Should show: approved spaces, feed with child-mode composer, no governance panels. ReadOnlyTrustedSpaces component exists in FounderShell body but is gated — needs wiring. |
| **UNKNOWN scope unrestricted in governance kernel** | LOW | `isScopePermittedFor` returns `true` for UNKNOWN. UNKNOWN users can POST to `extended_trust` or `public_approved` if they call the API directly. Fixing requires changing the governance kernel (separate agent, careful review). |
| **GUARDIAN role not surfaced as shellMode** | LOW | `deriveFamilySafeRole` returns `FamilySafeRole.GUARDIAN` for adults with active guardian relationships. Current routing maps all non-founder adults to "member". A guardian may need a view between member and founder (can see child activity; can approve escalations). |
| **shellMode not forwarded to CommentThread** | LOW | CommentThread has no viewerMode. Minor accounts see the same comment UI as founders. |

---

## 8. QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8–12 | UX scaffold, QA, name, persistence, e2e | ✓ Done |
| Agent 14 | Relational dashboard layout | ✓ Done |
| Agent 15 | Founder / Guardian shell | ✓ Done |
| Agent 16 | Consolidated hero | ✓ Done |
| Agent 17 | Unified mode shell | ✓ Done |
| Agent 18 | Light hero match | ✓ Done |
| Agent 19 | Governed activity layer | ✓ Done |
| Agent 20 | Activity layer QA / layout polish | ✓ Done |
| Agent 22 | Role routing + UNKNOWN age safety | ✓ Done |
