# Agent 36 — Family Safe Policy Profile Audit

**Date:** 2026-05-11  
**Branch:** aihsafe-agent-36-policy-profile-audit  
**Scope:** Read-only. No product code changed.

---

## 1. What Exists Now

### Schema (prisma/schema.prisma)

| Model | Purpose | Status |
|---|---|---|
| `User.dateOfBirth` | Source of truth for age tier derivation | ✅ Present, optional |
| `User.role` | SystemRole (founder / admin / member) | ✅ Present |
| `User.relationship` | Relationship label set at invite time | ✅ Present |
| `AihGuardianRelationship` | Guardian ↔ child link with permission level | ✅ Present |
| `AihFamilyUnit` + `AihFamilyUnitMember` | Named family grouping with roles | ✅ Present |
| `AihApprovalRequest` | Persistent governance escalation record | ✅ Present |
| `AihAuditEvent` | Immutable governance audit log | ✅ Present |
| `AihTrustUnitMeta.maxMemberCount` | Only numeric limit in system (default 3) | ✅ Present |
| `AihActivityPost.governanceState` | Post allowed/blocked state | ✅ Present |
| `AihActivityPost.visibilityScope` | Scope string on every post | ✅ Present |

### Types (types/aihsafe/)

| Type file | Coverage | Status |
|---|---|---|
| `age-tiers.ts` | CHILD/PRETEEN/TEEN/ADULT/ELDER constants, boundary numbers, `isMinorTier()` | ✅ Complete |
| `visibility.ts` | `VisibilityScope` enum, `MINOR_ALLOWED_SCOPES`, `TEEN_ALLOWED_SCOPES` | ✅ Complete |
| `visibility-rules.ts` | `SCOPE_MATRIX`, `MAX_SCOPE_FOR_TIER` | ✅ Complete |
| `governance.ts` | `ActorContext`, `TargetContext`, `GovernanceDecision`, `ReasonCode` | ✅ Complete |
| `roles.ts` | `SystemRole`, `FamilySafeRole`, `TrustUnitRole` | ✅ Complete |
| `guardian.ts` | `GuardianRelationshipKind`, `GuardianPermissionLevel`, `GuardianRelationship` | ✅ Complete |
| `membership.ts` | `MembershipState`, `MembershipKind`, `Membership` | ✅ Complete |
| `invite-states.ts` | `AIHInviteState` with terminal-state guards | ✅ Complete |
| `audit-events.ts` | `AuditEventKind` constants and envelope | ✅ Complete |
| `dto.ts` | All API request/response DTOs | ✅ Complete |

### Governance Kernel (lib/aihsafe/governance/index.ts)

| Function | Coverage |
|---|---|
| `deriveAgeTier()` | ✅ Age from DOB, correct boundary math |
| `deriveFamilySafeRole()` | ✅ CHILD / GUARDIAN / ADULT from tier + guardianship |
| `canCreateTrustUnit()` | ✅ Child=hard deny, teen=escalate, adult=allow |
| `canInviteToTrustUnit()` | ✅ Minor=hard deny; adult-inviting-minor=escalate |
| `canJoinTrustUnit()` | ✅ Minor=escalate, adult=allow |
| `canApproveChildAction()` | ✅ Requires APPROVER or FULL_CONTROL guardian perm |
| `canCreateChildAccount()` | ✅ Minor cannot initiate |
| `canManageMembership()` | ✅ Requires CREATOR/MODERATOR; minor target=escalate |
| `canPostContent()` | ✅ Scope gate by age tier |
| `canComment()` | ✅ Scope + membership gate |
| `canMessage()` | ✅ Shared unit or guardian edge required; minors restricted |
| `canExitMembership()` | ✅ Active member guard |
| `canExpandTrust()` | ✅ Minor=hard deny; adult-expanding-to-minor=escalate |

All governance functions are pure, synchronous, and side-effect-free.

### Context Builder (lib/aihsafe/context/buildActorContext.ts)

- Assembles full `ActorContext` from DB: memberships, guardian relationships, relationship edges
- Derives `ageTier` and `familySafeRole` at call time
- Used by every AIH Safe API route before governance calls

### Visibility Service (lib/aihsafe/visibility/index.ts)

- `canView()` — full 6-scope decision tree
- `resolveMaxScope()` — returns tier's maximum scope
- `filterVisibleUsers()` — coarse actor-side filter
- `isScopeAllowedForAgeTier()` — binary gate for input validation

### Shell Mode Routing (components/aihsafe/roles/shellMode.ts)

- `deriveShellMode()` maps role + DOB → `"founder"` | `"member"` | `"child"`
- Called in the `aihsafe` page server component; result passed to `FounderShell`
- Controls which UI panels and tabs render (NOT a security boundary)

### UI Shell (components/aihsafe/founder/FounderShell.tsx)

- Three hero modes: founder / member / child
- Child hero: safe-space welcome + 2 tabs (Activity, Spaces)
- Member hero: trusted-spaces summary + conditional guardian attention signal
- Founder hero: full governance stats, pending approvals/invites counters
- Tab visibility by role: child=2 tabs, member=4, member+guardian=5, founder=6
- `FounderSettingsPreview` is a **static hardcoded card** — no live data model

### API Routes (app/api/aihsafe/)

| Route | Coverage | Status |
|---|---|---|
| POST /family | Create family unit with governance gate | ✅ Live |
| GET /family | List family units | ✅ Live |
| POST /guardian-links | Establish guardian ↔ child link | ✅ Live |
| GET /guardian-links | List guardian relationships | ✅ Live |
| POST /invites | Governed invite with escalation for minors | ✅ Live |
| GET /invites | List sent invites | ✅ Live |
| POST/GET /trust-units | Trust unit lifecycle | ✅ Live |
| POST/GET /memberships | Join/exit memberships | ✅ Live |
| POST /memberships/[id] | Manage membership (approve/revoke) | ✅ Live |
| POST /approvals | Resolve approval requests | ✅ Live |
| GET/POST /activity | Feed posts (governance-gated) | ✅ Live |
| POST /activity/[postId]/comments | Governed comments | ✅ Live |

### Registration (app/api/auth/register/route.ts)

- Accepts `dateOfBirth` (optional) — stored in `User.dateOfBirth`
- Sets `role = "founder"` for first user, `"member"` for all subsequent
- Sets `invitedById` FK from invite record's `senderId`
- Creates `Profile` with defaults
- **No Family Safe policy defaults are assigned here**
- No guardian link is auto-established
- No shell mode, age tier, or policy profile is stamped

---

## 2. What Is Partially Wired

| Item | Status |
|---|---|
| Age tier derivation | Computed correctly but never persisted; re-derived on every request |
| Shell mode | Derived at page level and passed to shell, but not stored anywhere |
| `lib/aihsafe/invites/` | Stub functions — `sendChildInvite`, `guardianApproveInvite`, `guardianDeclineInvite` all throw "Not implemented" |
| `FounderSettingsPreview` | UI card renders but reads from a hardcoded const array — no API, no DB |
| Child escalation flow | Governance kernel correctly escalates + creates `AihApprovalRequest`; no child-facing "pending request" UI exists to show the child their request is awaiting approval |
| Guardian inbox | Fully functional for guardians; child has no reciprocal "requests I've sent" view |
| `AihFamilyUnitMember.role` | `guardian/child/adult` stored but not derived from age tier automatically |

---

## 3. What Is Missing

### Schema gaps

| Missing model | Purpose |
|---|---|
| `AihPolicyProfile` | Per-user or per-family-unit governance settings (configurable defaults) |
| `AihFounderSettings` | Network-wide policy: invite permissions, approval posture, visibility defaults |
| `AihInterestCategory` | Curated categories visible to children (sports, art, school, etc.) |
| `AihAllowedHashtag` | Per-category hashtags that children may use |
| `AihPostingLimit` | Per-tier or per-user daily/weekly post and invite limit |
| `AihChildPreferences` | Child-visible display preferences (avatar, display name, pronoun, interests) |
| `AihOnboardingState` | Tracks which onboarding steps a user has completed |

### Type gaps

| Missing type | Purpose |
|---|---|
| `PolicyProfile` | Typed contract for the configurable policy surface |
| `FounderSettingsDTO` | API response for founder's network-wide settings |
| `InterestCategoryDTO` | Curated category with icon, color, age-gate |
| `PostingLimitDTO` | Per-day/per-week limit with current usage |
| `ChildPreferencesDTO` | Child-visible personalization fields |

### Service gaps

| Missing service | Purpose |
|---|---|
| `lib/aihsafe/policy/` | Read/write policy profiles; enforce defaults on new users |
| `lib/aihsafe/limits/` | Check and increment per-day post/invite counters |
| `lib/aihsafe/interests/` | Resolve allowed categories and hashtags for a given age tier |
| `lib/aihsafe/onboarding/` | Drive post-registration setup steps per role |
| `lib/aihsafe/invites/` (stubs) | `sendChildInvite`, `guardianApproveInvite`, `guardianDeclineInvite` must be implemented |

### API gaps

| Missing endpoint | Purpose |
|---|---|
| GET/PATCH /api/aihsafe/founder-settings | Read/write network policy (founder only) |
| GET /api/aihsafe/policy-profile/[userId] | Read a user's effective policy profile |
| GET /api/aihsafe/interests | List allowed categories for the caller's age tier |
| GET /api/aihsafe/interests/[categoryId]/hashtags | Hashtags within a category |
| GET /api/aihsafe/limits/[userId] | Current usage vs. limits for the caller |
| GET /api/aihsafe/escalations/mine | Child-facing: my pending escalation requests |

### UI gaps

| Missing UI surface | Purpose |
|---|---|
| Founder Settings editor | Live controls for invite rules, approval posture, visibility defaults |
| Child interests panel | Curated category grid; child picks interests, parent approves additions |
| Child escalation status | "Your request is waiting for your parent's approval" status card |
| Post limit indicator | Friendly "X posts remaining today" nudge for children |
| Registration onboarding | Age verification prompt, guardian-link wizard, policy defaults selection |
| Member profile defaults | DOB capture for members who registered without it |
| Allowed hashtag list | Parent-facing allowlist management; child-visible use count |

### Onboarding gaps

| Missing step | Purpose |
|---|---|
| DOB collection at registration | `dateOfBirth` is optional today; children have no verified age |
| Guardian link wizard | New adult users are not prompted to link existing children |
| Policy defaults assignment | No role-specific defaults (child: guardian_only scope, limited posts; adult: family scope) |
| Welcome policy acknowledgment | No "here are your network's rules" screen on first login |

---

## 4. Risk If We Continue Without It

| Risk | Severity | Detail |
|---|---|---|
| Children register with `UNKNOWN` age tier | **Critical** | No DOB → governance kernel defaults to ADULT permissions. A child who registers without DOB gets full adult scope. |
| Founder Settings is cosmetic only | **High** | The "Governance Settings" card shows four hardcoded values. Changing them has no effect. Founder cannot actually configure the network. |
| Child invite service stubs throw errors | **High** | `sendChildInvite` throws at runtime. If the invite UI ever routes through the AIH Safe invite path for a child, it crashes. |
| No per-day limits | **Medium** | Nothing prevents a child from posting 500 times per day. Governance only checks scope, not frequency. |
| No allowed hashtag enforcement | **Medium** | Children can tag any content with any hashtag. No parental allowlist is checked. |
| Child has no visibility into pending requests | **Medium** | After a governance escalation, the child receives a 202 response but has no UI to track whether the parent approved or denied. |
| No network-wide policy model | **Medium** | Every governance decision uses hardcoded rules. Adding configurable posture (e.g., "allow teen posting without guardian approval") requires code changes. |
| No onboarding sequence | **Low** | New members arrive at the dashboard with no guidance on Safe features; guardian links must be manually established by finding the user in the tree. |

---

## 5. Recommended Data Model

```
AihFounderSettings (1 per network)
  id, networkId (singleton), invitePolicy, approvalPosture,
  defaultVisibilityScope, minorDiscoveryAllowed,
  maxInvitesPerDayAdult, maxInvitesPerDayMember,
  createdAt, updatedAt

AihPolicyProfile (1 per user)
  id, userId (unique), effectiveAgeTier, shellModeOverride,
  defaultVisibilityScope, canPostContent, canComment, canInvite,
  dailyPostLimit, dailyInviteLimit,
  createdAt, updatedAt

AihInterestCategory
  id, slug, label, iconEmoji, minAgeTier, sortOrder, isActive

AihAllowedHashtag
  id, tag, categoryId→AihInterestCategory, isActive, createdByFounder

AihUserInterest (child picks from allowlist)
  id, userId, categoryId, approvedByGuardianId, approvedAt

AihPostingLimit (rolling window counters)
  id, userId, windowDate, postsCreated, invitesSent

AihOnboardingState (per user)
  id, userId (unique), dobCapturedAt, guardianLinkedAt,
  policyAcknowledgedAt, interestSetupAt, completedAt
```

---

## 6. Recommended Service Boundaries

```
lib/aihsafe/policy/
  getEffectivePolicyProfile(userId)   → AihPolicyProfile (with founder overrides applied)
  createDefaultPolicyProfile(userId, ageTier)  → called at registration
  updatePolicyProfile(userId, patch)  → founder/guardian only

lib/aihsafe/limits/
  checkPostingLimit(userId, action)   → { allowed, remaining, resetsAt }
  incrementLimit(userId, action)      → void (called after successful create)

lib/aihsafe/interests/
  getAllowedCategories(ageTier)       → AihInterestCategory[]
  getAllowedHashtags(categoryId)      → AihAllowedHashtag[]
  setUserInterests(userId, categoryIds, guardianId)

lib/aihsafe/onboarding/
  getOnboardingState(userId)          → AihOnboardingState
  markStepComplete(userId, step)      → void

lib/aihsafe/invites/ (implement stubs)
  sendChildInvite(...)
  guardianApproveInvite(...)
  guardianDeclineInvite(...)
```

---

## 7. Recommended UI Surfaces

| Surface | Location | Mode |
|---|---|---|
| Founder Settings editor | `/aihsafe` → Settings tab | founder only |
| Child interests picker | `/aihsafe` → child Overview tab | child |
| Child escalation tracker | `/aihsafe` → child Overview tab | child |
| Post limit nudge | Above post composer in ActivityFeed | child |
| Allowed hashtag manager | `/aihsafe` → Settings tab | founder only |
| Registration DOB prompt | `/register` or post-login modal | all |
| Guardian-link wizard | Post-registration onboarding step | adult members |
| Policy acknowledgment | First-login modal | new members |

---

## 8. Source Map Summary

| Audit Question | Files Checked | Finding |
|---|---|---|
| Age tier | `types/aihsafe/age-tiers.ts`, `lib/aihsafe/governance/index.ts` | Correct derivation, never persisted |
| Registration defaults | `app/api/auth/register/route.ts` | No Safe defaults assigned |
| Shell mode | `components/aihsafe/roles/shellMode.ts`, `app/(app)/aihsafe/page.tsx` | Correct derivation, not stored |
| Governance kernel | `lib/aihsafe/governance/index.ts` | All 10 gate functions implemented |
| Visibility service | `lib/aihsafe/visibility/index.ts` | All 4 functions implemented |
| Context builder | `lib/aihsafe/context/buildActorContext.ts` | Complete |
| Invite service | `lib/aihsafe/invites/index.ts` | All 4 functions are stubs (throw) |
| Founder settings | `components/aihsafe/founder/FounderSettingsPreview.tsx` | Static hardcoded card only |
| Child UI | `components/aihsafe/founder/FounderShell.tsx` | Welcome card + 2 tabs; no interests, no escalation status |
| Hashtags | All files | Absent — no schema, types, service, or UI |
| Limits | All files | Absent — only `maxMemberCount` exists on `AihTrustUnitMeta` |
| Onboarding | All files | Absent — no step tracking, no DOB requirement, no guardian-link wizard |
