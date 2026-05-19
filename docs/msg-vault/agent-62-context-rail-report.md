# Agent 62 — Msg Vault Context Rail MVP

**Branch:** `aihsafe-agent-62-msg-vault-context-rail`  
**Date:** 2026-05-19

---

## Summary

The Msg Vault **right rail** (`MsgContextRail`) now reflects the **selected conversation** or **notice**: kind, participants, trust unit, governance overlay, read status, and notice actions — using existing `GET /api/msg-vault/conversations/[id]` data plus `buildRelationshipContext`.

No Prisma schema changes. No new social features.

---

## Files changed

| File | Change |
|------|--------|
| `components/msg-vault/MsgContextRail.tsx` | Rail profiles: DEFAULT, DIRECT, THREAD, NOTICE |
| `components/msg-vault/MsgVaultShell.tsx` | Pass conversation context into rail |
| `components/vault/ContextRailSection.tsx` | **New** — shared section + meta list |
| `lib/msg-vault/context/rail.ts` | **New** — client formatters |
| `types/msg-vault/context-rail.ts` | **New** — `TrustUnitContextDTO` |
| `types/msg-vault/index.ts` | Export context-rail types |
| `app/api/msg-vault/conversations/[conversationId]/route.ts` | Add `relationshipContext`, `trustUnit`, `privateThreadsEnabled` |
| `lib/msg-vault/api-client.ts` | Extended `fetchConversationDetail` return type |
| `docs/msg-vault/agent-62-context-rail-report.md` | This report |

---

## Rail states added

| State | When | Sections |
|-------|------|----------|
| **DEFAULT** | No conversation / overview messaging | Governance placeholder + Family Safe hint |
| **CONVERSATION** (shared) | Any selected chat/thread | Title, kind, status, your read status, last message time |
| **GOVERNANCE** | Conversation selected | `GovernanceOverlayDTO`: visibility reason, scope, policy source, external links, guardian visibility, escalation |
| **DIRECT** | `kind === DIRECT` | Participants + read labels; relationship edges; guardian note when active |
| **THREAD** | Group / TU / space thread | Trust unit block (name, space type, scope, private-thread network flag); participants; visibility scope; shared context edges |
| **NOTICE** | Notices tab selection | Title/body, action-required banner, kind/source/time, approval/conversation/TU links, context lines, href |

---

## Data sources

| Data | Source |
|------|--------|
| Conversation + participants | `GET /api/msg-vault/conversations/[id]` |
| `GovernanceOverlayDTO` | `buildGovernanceOverlay()` (same route) |
| `RelationshipContextDTO` | `buildRelationshipContext()` (added to same route) |
| Trust unit summary | `TrustUnit` + `AihTrustUnitMeta` on conversation load |
| Private threads network flag | `AihFounderSettings.enablePrivateThreads` |
| Read/unread per participant | `MsgParticipantDTO.lastReadAt` vs `conversation.lastMessageAt` (client) |
| Notice detail | `VaultNoticeItem` from `/api/msg-vault/notices` |

---

## Remaining gaps

- No dedicated `GET /api/msg-vault/context` BFF (per architecture doc — future).
- Shared **dashboard spaces** list for direct chats not loaded (only relationship edge labels).
- **Daily limits** / pending approvals not in rail (Family Safe / escalations APIs).
- **Mark-read** not wired — read status is heuristic from `lastReadAt`.
- **SPACE** profile (space without thread) not implemented — no space-only selection in shell yet.
- Mobile bottom-sheet rail not implemented (desktop column only).

---

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Run after merge |
| `npm run build` | Run after merge |
