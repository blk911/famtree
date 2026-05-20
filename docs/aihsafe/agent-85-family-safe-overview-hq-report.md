# Agent 85 — Family Safe Overview Operational HQ

**Branch:** `aihsafe-agent-85-family-safe-overview-hq`  
**Mission:** Turn Family Safe Overview into a governed relationship + space operations center (not a static settings hub or Dashboard duplicate).

---

## 1. Files modified

| File | Change |
|------|--------|
| `components/aihsafe/founder/FounderShell.tsx` | Overview tab → `OverviewOperationalHQ`; `unreadNotices` from Msg Vault; rail props; removed legacy overview panels / dead styles |
| `components/aihsafe/founder/OverviewOperationalHQ.tsx` | **New** — six-section operational overview |
| `components/aihsafe/founder/overview/buildGovernedEvents.ts` | **New** — merge invites, approvals, spaces, feed into timeline |
| `components/aihsafe/founder/overview/buildPeopleSnapshot.ts` | **New** — steward / children / trusted adults / adults |
| `components/aihsafe/navigation/FamilySafeTabs.tsx` | Default tab `overview` for all shell modes; child tabs include overview |
| `components/context-rail/profiles/GovernanceRailProfile.tsx` | Operational right rail (needs attention, counts, recent invites, Msg Vault with status) |
| `components/context-rail/FamilySafeContextLayout.tsx` | Pass `unreadNotices`, `membershipCount`, `recentInvites` |
| `components/context-rail/types.ts` | Extended `GovernanceRailProps` |
| `app/globals.css` | `.aihsafe-overview*` layout and density styles |

**Reused (unchanged):** `OverviewCommandCard`, `CompactActivityItem`, `ChildEscalationStatus`, existing `apiClient` + `fetchNotices`.

---

## 2. Overview content added

1. **Attention queue** — `OverviewCommandCard` at top (founder / guardian / child variants). Copy: “Everything looks clear today.” when empty; extras for Msg Vault notices and child pending escalations.
2. **Active spaces** — Up to 6 family + trusted spaces with member count and created date; empty: invite or create trusted space.
3. **People snapshot** — Steward, children, trusted adults, adult members (from guardian links + member candidates).
4. **Recent governed activity** — Up to 6 merged events (invites, pending/recent approvals, space created, feed posts awaiting approval).
5. **Suggested actions** — Compact chips: review approvals, invite, create space/family, add trusted adult; always includes Open Msg Vault (with unread count when > 0).
6. **Child shell** — Approved spaces, boundaries hint, `ChildEscalationStatus` for requests.

---

## 3. Right rail changes

Removed generic duplicate nav (My Network, bare Msg Vault link).

**Now:**
- **Needs attention** — pending approvals + invites + unread notices summary
- **Governance card** — active spaces, people in spaces, trusted adults, role line
- **Recent invites** — last 3 recipient emails (founder/guardian/member, not child)
- **People nearby** — up to 5 space members (compact list)
- **Quick actions** — contextual buttons (review approvals, pending invites, invite, Msg Vault with count)
- **Msg Rules** — short boundaries copy + link to settings tab (editable roles only)
- **Child** — boundaries read-only blurb instead of full stats card

---

## 4. Role behavior

| Role | Overview | Rail |
|------|----------|------|
| **Founder / admin** | Full HQ: attention, spaces, people, activity, all suggested actions | Full counts + edit Msg Rules |
| **Guardian (member)** | Same tabs as founder; approvals in attention + suggested actions | Approvals + invite actions |
| **Adult member** | Read-oriented: invites in attention if any; spaces/activity; fewer action chips | View-only governance meta |
| **Child / teen** | Approved spaces, boundaries, escalation requests | Boundaries snapshot only |

Tabs preserved: Overview · Spaces · Activity · Members · Approvals · Msg Rules (label varies by role).

---

## 5. Empty states

| Section | Copy |
|---------|------|
| Attention | “Everything looks clear today.” |
| Active spaces | “No active spaces yet. Invite someone or create a trusted space.” |
| People | “Invite your first trusted person.” |
| Governed activity | “No recent governed activity yet.” |
| Child spaces | “No active spaces yet. Ask your family steward…” |
| Rail attention | “All clear — no pending invites or approvals.” |

---

## 6. Data sources used

All existing client APIs — **no new routes, no Prisma changes.**

| Data | Source |
|------|--------|
| Family / trust units | `listFamilyUnits`, `listTrustUnits` |
| Pending approvals | `listApprovals("pending")` |
| Recent resolved approvals | `listApprovals("approved")` (founder/guardian) |
| Invites | `listInvites` |
| Guardian links | `listGuardianLinks` |
| Activity feed | `listActivityFeed` |
| Child requests | `listMyEscalations("pending")` |
| Unread notices | `fetchNotices()` (`lib/msg-vault/api-client`) |
| Active spaces filter | `getActiveTrustUnits` + membership filter |
| People rows | `buildMemberCandidates` + guardian link DTOs |

---

## 7. Remaining gaps

- **Last activity per space** — uses `createdAt` only; no per-space “last post/message” timestamp in current DTOs.
- **Msg Rules change events** — not in activity/audit feed exposed to this page; timeline cannot show rule edits yet.
- **Trusted adult requests** — no dedicated pending queue API; surfaced only via generic approvals when present.
- **Boundary alerts** — no separate “Msg Rules alert” stream; unread notices partially stand in.
- **Deep link into a single space** from overview row — routes to Spaces tab, not a specific space detail.

---

## 8. Validation results

```text
npm run typecheck  — PASS
npx next build     — PASS
```

---

## Copy tone

Uses: trusted spaces, family steward, boundaries, Msg Rules, needs your attention, all clear.  
Avoids: policy engine, admin dashboard, surveillance, restrictions.
