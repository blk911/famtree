# Agent 51 — Msg Vault UI Shell Report

**Date:** 2026-05-19  
**Branch:** `aihsafe-agent-51-msg-vault-ui-shell`  
**Status:** Complete

---

## 1. Files created

| Path |
|---|
| `app/(app)/msg-vault/page.tsx` |
| `components/msg-vault/MsgVaultShell.tsx` |
| `components/msg-vault/MsgVaultTabs.tsx` |
| `components/msg-vault/ConversationList.tsx` |
| `components/msg-vault/ConversationPanel.tsx` |
| `components/msg-vault/MessageComposer.tsx` |
| `components/msg-vault/NoticesPanel.tsx` |
| `components/msg-vault/MsgContextRail.tsx` |
| `lib/msg-vault/api-client.ts` |
| `lib/msg-vault/display.ts` |
| `docs/msg-vault/agent-51-ui-shell-report.md` |

## 2. Files modified

| Path | Change |
|---|---|
| `components/AppSidebar.tsx` | Msg Vault → `/msg-vault`; added Family Safe → `/aihsafe` |
| `components/dashboard/DashboardVaultTabs.tsx` | Msg Vault tab link → `/msg-vault` |
| `app/(app)/aihsafe/page.tsx` | Page title → Family Safe |
| `components/AppPageHero.tsx` | Hide default hero on `/msg-vault` |
| `middleware.ts` | Protect `/msg-vault` and `/aihsafe` at edge |
| `app/globals.css` | Responsive `.msg-vault-grid` |

---

## 3. Route / page behavior

- **`/msg-vault`** — Server page loads auth + `deriveShellMode`, renders `MsgVaultShell`.
- **Tabs:** Overview, Chats, Threads, Notices (internal only).
- **Chats / Threads:** 3-column layout — conversation list | messages + composer | governance rail.
- **Overview:** Stats + role-aware welcome copy.
- **Notices:** Full-width panel; mark read via `POST /api/msg-vault/notices/[id]/read`.
- All data from existing `/api/msg-vault/*` routes only.

---

## 4. Empty states

| Surface | Copy |
|---|---|
| Conversation list | No open search; trust relationship required |
| Conversation panel | Select a conversation; governed messaging only |
| Messages | Send first message in this space |
| Notices | No notices; child vs adult tone |
| Context rail | Select conversation for visibility reason |

---

## 5. Context rail behavior

Shows `GovernanceOverlayDTO` from conversation detail API:

- Visibility reason sentence  
- Scope, guardian oversight, external link policy  
- Escalation pending warning  
- Link to Family Safe for policy management (non-child)  

---

## 6. Validation results

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run build` | ⚠️ `prisma generate` EPERM if dev server locks DLL — stop dev server and re-run |

---

## 7. Not in scope

- Creating conversations from UI (no member picker — use dashboard / trust flows first)  
- Thread creation form  
- Real-time updates / WebSocket  
- Reactions, attachments, search  
