# Agent 108 — Posts / Chats / Messages boundary report

**Branch:** `msgvault-agent-108-posts-chats-boundary`  
**Date:** 2026-05-19  
**Scope:** Copy + glossary + light dashboard private-tab filter (direct chats only). No Prisma, no dashboard layout redesign, no data removal.

---

## Files inspected

| Area | Paths |
|------|--------|
| Msg Vault UI | `components/msg-vault/**`, `components/ui/msg-vault.tsx` |
| Vault shared | `components/vault/**` |
| Dashboard | `components/dashboard/**`, `app/(app)/dashboard/**` |
| Context rail | `components/context-rail/profiles/DashboardRailProfile.tsx` |
| Family Safe | `components/aihsafe/feed/PostComposer.tsx` |
| Studios | `components/studios/**` (no user-facing post/message blur found) |
| App shell | `components/AppPageHero.tsx`, `components/AppShell.tsx` |
| Tree / bonds | `components/tree/TrustUnitCard.tsx`, `components/family-vault/BondFamilyRow.tsx` |
| Msg Vault lib | `lib/msg-vault/context/rail.ts`, `lib/msg-vault/**` (labels only) |
| Docs | `docs/msg-vault/*`, `docs/product/` (new) |

---

## Files modified

| File | Change |
|------|--------|
| `lib/product/communication-copy.ts` | **New** — shared Post / Chat / Message / Thread / Notice strings |
| `docs/product/communication-model.md` | **New** — product glossary |
| `docs/msg-vault/agent-108-posts-chats-boundary-report.md` | **New** — this report |
| `components/msg-vault/MessageComposer.tsx` | Composer: “Write a message…”, closed chat copy |
| `components/msg-vault/ConversationPanel.tsx` | Empty/select + “This chat is …” status |
| `components/msg-vault/layout/ConversationListPanel.tsx` | Tab empty states; “Start chat” preview |
| `components/msg-vault/MsgVaultShell.tsx` | Error copy: “open chat” (not “governed chat”) |
| `components/msg-vault/MsgVaultThreadSelectorRail.tsx` | “Start a chat” tooltip |
| `components/msg-vault/MsgContextRail.tsx` | “Threads” label (was “Private threads”) |
| `components/msg-vault/rail/MsgVaultContextRail.tsx` | Context empty states from copy module |
| `lib/msg-vault/context/rail.ts` | Kind label: DIRECT → “Chat”; default → “Chat” |
| `components/vault/EmptyThreadState.tsx` | Centralized empty titles |
| `components/dashboard/DashboardPostComposer.tsx` | “Share a post…” |
| `components/dashboard/DashboardActivityCtaStrip.tsx` | Posts / Private chats / Msg Vault CTAs |
| `components/dashboard/DashboardVaultTabs.tsx` | Tab + panel: “Private chats” |
| `components/dashboard/DashboardPrivateThreadCenter.tsx` | **Direct chats only** in dashboard embed |
| `components/context-rail/profiles/DashboardRailProfile.tsx` | Split rail: Private chats + Threads + Msg Vault blurb |
| `components/AppPageHero.tsx` | Msg Vault subtitle |
| `components/aihsafe/feed/PostComposer.tsx` | “Post an update in …” |
| `components/family-vault/BondFamilyRow.tsx` | “Open private chat” |
| `components/tree/TrustUnitCard.tsx` | “Open group thread” |

---

## Terminology cleaned

| Before (blur) | After (aligned) |
|---------------|-----------------|
| “Write a governed message…” | “Write a message…” |
| “This conversation is closed.” | “This chat is closed.” |
| Dashboard “Write a short update…” | “Share a post…” |
| “Private Threads” (dashboard tab/rail) | “Private chats” (1:1); threads in separate rail section |
| “Open governed messages” | “Open Msg Vault” |
| “Check governance notices” | “Check notices” |
| “Governed chats and threads” (hero) | “Private chats, threads, and notices” |
| Space “Share something in …” | “Post an update in …” |
| “Direct chat” (kind) | “Chat” |
| “Start a governed chat” | “Start a chat” |
| Bond row “Open private conversation” | “Open private chat” |
| TU card “Open private TU conversation” | “Open group thread” |

Msg Vault status bar (Agent 107) already used **Chats | Threads | Notices** — unchanged.

---

## Boundaries confirmed

### Msg Vault

- **Center pane:** `ConversationPanel` + `MessageComposer` + message list only; notices use `NoticeDetailPanel`. No post feed or `PostCard` in shell.
- **Left list:** Chats (direct), Threads (group/space), Notices — separate filters.
- **Copy:** Container = chat/thread; item = message.

### Dashboard

- **Posts tab:** `DashboardPostsPanel` + `DashboardPostComposer` — posts only.
- **Private chats tab:** `DashboardPrivateThreadCenter` now uses `directConversations` only (not group threads).
- **Msg Vault CTA:** Routes to `/msg-vault` for threads/notices; not merged with posts.
- **Awareness layer preserved** — no layout redesign.

### Spaces / Studios

- **Family Safe:** `PostComposer` uses post/update language.
- **Studios:** No “message” conflation found in studio UI strings; studio content remains posts/updates via existing flows.

---

## Remaining ambiguous areas

| Item | Notes |
|------|--------|
| Code identifiers | `MsgConversationDTO`, `ThreadComposer`, `DashboardPrivateThreadCenter` filename — internal names unchanged (safe). |
| `privateThreadsCount` signal | Dashboard CTA still counts legacy “private threads” metric name; behavior unchanged. |
| `family-vault/private` hero | “Private Feed” / “direct messages” in `AppPageHero` — legacy route, not in 108 scope. |
| API / lib comments | e.g. `lib/msg-vault/policy.ts` “governed messages” — developer comments only. |
| `ThreadComposer` component | Shared composer for vault messages; name is technical, UI placeholder is correct. |
| Notice thread kind | `NOTICE_THREAD` kind label still “Notice thread” in rail formatter — distinct from user “Notice” tab items. |
| Dashboard rail | Selecting a **thread** from rail still sets active conversation globally; center tab shows only if user picks a direct chat (thread selection visible in rail, opens in Msg Vault via link). |

---

## Validation

```text
npm run typecheck  → (run at commit time)
npx next build     → (run at commit time)
```

Record results below after CI/local run.

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

---

## Related docs

- `docs/product/communication-model.md` — canonical glossary
- `docs/msg-vault/agent-107-ig-shell-report.md` — IG shell layout (prerequisite branch)
