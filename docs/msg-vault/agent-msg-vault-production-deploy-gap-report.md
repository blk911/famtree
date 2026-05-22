# Msg Vault production deploy gap — debug report

**Date:** 2026-05-22  
**Reporter symptom:** `amihuman.net/msg-vault` shows empty left column, “Welcome back, {name}” overview card, hero “Governed chats and threads”, CONTEXT idle — not the new IG-style shell.

---

## Root cause

**Deploy gap, not a missing commit on the feature branch.**

| Location | Msg Vault UI |
|----------|----------------|
| `origin/msgvault-agent-108-posts-chats-boundary` | Agent **107** IG shell + Agent **108** copy (`CommunicationShell`, list + center + context) |
| `origin/main` (before 2026-05-22 merge) | Legacy **Overview** tab, `MsgVaultLeftNav`, welcome card, layout regression (0px left column) |

Production (`amihuman.net`) builds from **`main`**. Agents 107–108 were pushed to a **feature branch only** (`4bc2637`, `8119056`) and were **not merged to `main`** until this repair.

The screenshot matches **old `main`** exactly:

- Hero: “Governed chats and threads”
- Center: “Welcome back, Spencer” + “Governed messaging workspace” + count rows
- Left: empty (LT grid `minmax(0, 172px)` collapse — documented in `agent-msg-vault-layout-regression-report.md`)
- Right: “Select a section to open a conversation.”

No per-user profile flag hides Msg Vault; all users on old `main` see the same broken/legacy UI.

---

## Repair

1. **Merged** `msgvault-agent-108-posts-chats-boundary` → `main` (fast-forward to `4bc2637`).
2. **Pushed** `origin/main` so Vercel can deploy.

**Expected after deploy:**

- Top pills: **Chats | Threads | Notices**
- **Left column:** conversation list (not empty at ≥861px width)
- **Center:** message thread or “Select a chat to begin.” (no overview welcome card)
- Hero: “Private chats, threads, and notices”

---

## Verification checklist (post-deploy)

1. Vercel production deployment completes for `main` @ `4bc2637+`.
2. Hard refresh `/msg-vault` (or incognito).
3. Confirm left list + status pills visible at desktop width.
4. Open existing direct chat from list or **New**.
5. Optional: `?tab=overview` should redirect behavior to **chats** (legacy URL).

---

## Repo state (reference)

```
8119056 feat(msg-vault): IG-style communication shell (Agent 107)
4bc2637 feat(msg-vault): align Posts vs Chats vs Messages copy (Agent 108)
```

Both are now on `main` after merge/push.

---

## If still broken after deploy

| Check | Action |
|-------|--------|
| Stale CDN/browser cache | Hard refresh / incognito |
| Viewport &lt; 861px | Shell stacks; list is above center — scroll to list |
| Dev-only `Cannot find module './1682.js'` | Delete `.next`, restart `npm run dev` |
| Empty People but count ≥ 1 | Separate issue: `allowedContacts` / trust bonds (agent-87) |

---

## Related docs

- `docs/msg-vault/agent-107-ig-shell-report.md`
- `docs/msg-vault/agent-108-posts-chats-boundary-report.md`
- `docs/msg-vault/agent-msg-vault-layout-regression-report.md`
