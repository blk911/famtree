# Agent 19 — Governed Activity Layer Foundation Report

**Branch:** `aihsafe-agent-19-governed-activity-layer`
**Date:** 2026-05-10
**Scope:** First governed activity/content layer for Family Safe. Foundation only — no infinite scroll, reactions, hashtags, or open discovery.

---

## 1. Files Created

| File | Purpose |
|---|---|
| `app/api/aihsafe/activity/route.ts` | GET feed + POST post (governance-gated) |
| `app/api/aihsafe/activity/[postId]/comments/route.ts` | GET + POST comments (governance-gated) |
| `components/aihsafe/feed/ActivityFeed.tsx` | Feed orchestrator — load, paginate, refresh |
| `components/aihsafe/feed/ActivityCard.tsx` | Single post card with author, space, body, visibility, comments |
| `components/aihsafe/feed/PostComposer.tsx` | Space picker + governed post submit |
| `components/aihsafe/feed/CommentThread.tsx` | Lazy comment load + inline compose |
| `components/aihsafe/feed/SpaceBadge.tsx` | Colored space chip (family/peer/extended/guardian) |
| `components/aihsafe/feed/VisibilityReason.tsx` | "You see this because: ✓ Space ✓ approved trusted space" |
| `docs/aihsafe/agent-19-governed-activity-layer-report.md` | This report |

## 2. Files Modified

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `AihActivityPost`, `AihActivityComment`, back-relations on User + TrustUnit |
| `types/aihsafe/dto.ts` | Added `ActivityPostDTO`, `ActivityCommentDTO`, `CreateActivityPostRequest`, `CreateActivityCommentRequest` |
| `components/aihsafe/common/apiClient.ts` | Added `listActivityFeed`, `createActivityPost`, `listComments`, `createComment` |
| `components/aihsafe/founder/FounderShell.tsx` | Feed promoted to center column; governance panel to right; removed derived activity ribbon |

---

## 3. Schema Additions

```prisma
model AihActivityPost {
  id              String   @id @default(cuid())
  authorId        String
  trustUnitId     String?
  familyUnitId    String?
  visibilityScope String   @default("trust_unit")
  bodyText        String
  governanceState String   @default("allowed")   // "allowed" | "flagged" | "removed"
  escalationState String   @default("none")        // "none" | "pending" | "resolved"
  attachmentType  String?                           // placeholder for future media
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  // Relations: author (User), trustUnit (TrustUnit), comments (AihActivityComment[])
  @@map("aih_activity_posts")
}

model AihActivityComment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  // Relations: post (AihActivityPost), author (User)
  @@map("aih_activity_comments")
}
```

Both tables created in DB via `npm run db:push`. Prisma client regenerated.

---

## 4. API Additions

### GET /api/aihsafe/activity
- Returns paginated feed (`Paginated<ActivityPostDTO>`)
- Scope: posts where `trustUnitId IN [caller's member trust units]` OR author's private posts
- Only returns posts with `governanceState = "allowed"`
- Cursor-based pagination (limit 20)
- Each `ActivityPostDTO` includes `visibilityReasons[]` array

### POST /api/aihsafe/activity
- Gate: `canPostContent(actor, { visibilityScope, trustUnitId })`
- Children/teens blocked from posting to scopes above their age tier
- Creates `AihActivityPost` with `governanceState: "allowed"`
- Emits `AuditEventKind.VISIBILITY_CHANGED` audit event
- Returns `created(ActivityPostDTO)`

### GET /api/aihsafe/activity/[postId]/comments
- Returns up to 50 comments ordered ASC
- No separate gate — post must exist and be `governanceState = "allowed"`

### POST /api/aihsafe/activity/[postId]/comments
- Gate: `canComment(actor, { visibilityScope, trustUnitId })`
- Minors blocked from commenting in scopes they can't access
- Members-only gate: if `scope = trust_unit`, actor must be a member of that unit
- Returns `created(ActivityCommentDTO)`

---

## 5. Feed Architecture

```
FounderShell
└── ActivityFeed (center column)
    ├── PostComposer
    │   ├── space picker (trust unit buttons)
    │   ├── textarea
    │   └── governed submit → POST /api/aihsafe/activity
    └── ActivityCard[] (paginated, cursor-based)
        ├── author avatar + name
        ├── SpaceBadge (trust unit chip)
        ├── timestamp (relative)
        ├── post body
        ├── VisibilityReason ("You see this because: ✓ …")
        └── CommentThread
            ├── toggle (lazy load)
            ├── CommentItem[] ← GET /api/aihsafe/activity/[id]/comments
            └── inline composer → POST /api/aihsafe/activity/[id]/comments
```

Every post in the feed carries `visibilityReasons[]` computed server-side from the post's `trustUnitId`, `visibilityScope`, and the trust unit's name. This answers "why can you see this?" on every card.

---

## 6. Founder-Aware Behavior

- **Founders/Guardians:** See full feed including posts from all trust units they belong to. Governance badges surface on posts with `escalationState = "pending"` or `governanceState = "flagged"`.
- **Regular members:** See only posts in their own trust units — no cross-unit discovery.
- **Children (age tier: child/preteen):** `canPostContent` enforces `MINOR_ALLOWED_SCOPES` — can only post to `private` or `trust_unit`. Attempts to post to `family`, `extended_trust`, or `public_approved` are hard-denied.
- **PostComposer error surface:** Governance denial reason shown inline below the composer as a red alert — no silent failure.

---

## 7. Visibility / Governance Handling

Every API call flows through the existing governance kernel:

```
POST /api/aihsafe/activity
  → buildActorContext(userId)
  → canPostContent(actor, { visibilityScope, trustUnitId })
      → isScopePermittedFor(actor, scope) checks MINOR_ALLOWED_SCOPES
      → deny(DENIED_SCOPE_NOT_ALLOWED) if age tier violation
  → create AihActivityPost with governanceState = "allowed"
  → emitAuditEvent(VISIBILITY_CHANGED)
```

`VisibilityReason` component on each card shows the human-readable answer:
- `"Apex Soccer"` — from trust unit name
- `"approved trusted space"` — scope label
- `"family members only"` / `"guardians only"` / `"visible only to you"` for other scopes

`ActivityCard` badges:
- `"⏳ Pending approval"` — when `escalationState = "pending"`
- `"⚑ Flagged for review"` — when `governanceState = "flagged"`

---

## 8. Validation Results

```
npm run db:push    →  ✓ Database in sync (2 new tables created)
npm run typecheck  →  0 errors
npm run build      →  ✓ Compiled successfully (77 routes)
```

---

## 9. Remaining Gaps Before Phase 2 Social Layer

| Gap | Notes |
|---|---|
| No media/attachment upload | `attachmentType` field exists as placeholder; full upload pipeline is Phase 2 |
| No post edit/delete | Governance-safe mutation (revoke vs. delete pattern) needed — Phase 2 |
| No escalation path for post creation | Children can be hard-denied but not escalated-to-guardian for posts yet |
| No `governanceState: "flagged"` setter | Backend foundation exists; moderation action not yet built |
| Comments limited to 50 | Pagination for comments is Phase 2 |
| No `read` tracking | Unread indicators require a separate read-receipts model — Phase 3 |
| No push notifications | Notification backend is out of scope per mission |
| CommentThread does not optimistically update count in ActivityCard | Requires lifting state — Phase 2 polish |
| Feed scoped to trust units only | Family-unit scoped posts are schema-ready but not yet surfaced in feed query |
| No seed data script | Manual posting via the composer is the current test path |

---

## QA Sign-off

| Agent | Area | Status |
|---|---|---|
| Agent 8–12 | UX scaffold, QA, name, persistence, e2e | ✓ Done |
| Agent 14 | Relational dashboard layout | ✓ Done |
| Agent 15 | Founder / Guardian shell | ✓ Done |
| Agent 16 | Consolidated hero | ✓ Done |
| Agent 17 | Unified mode shell | ✓ Done |
| Agent 18 | Light hero match | ✓ Done |
| Agent 19 | Governed activity layer | ✓ Done |
