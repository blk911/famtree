# Msg Vault layout regression — debug report

**Date:** 2026-05-19  
**Symptom:** `/msg-vault` looks “corrupted” — large empty center, CONTEXT idle copy, section tabs (Overview / Chats / Threads / Notices) missing or unusable. Counts may show (e.g. Direct chats: 1) with no obvious way to open a thread.

**App status:** Dev server healthy when running (`next dev` on port 3000); page compiles and returns 200.

---

## Root cause

**LT-2 migration (`ui-lt-styling-foundation`)** moved Msg Vault layout from `app/globals.css` (`.msg-vault-workspace*`) into `components/ui/msg-vault.tsx` (Tailwind).

The new grid used **`minmax(0, 172px)`** for the left nav track. Under the shared **`max-w-[900px]`** app shell, grid auto-placement can **shrink that track to 0px**, so the nav column disappears. Users only see:

- Center: Overview welcome + summary counts
- Right: “Select a section to open a conversation.”

That matches a broken three-zone layout, not missing API data.

**Not the primary issue:** conversation display guard (Agent 87) — counts showing `1` imply directs are visible. Empty **People** list is a separate `allowedContacts` / trust-bond concern (see agent-87 report).

---

## Fix (code)

| File | Change |
|------|--------|
| `components/ui/msg-vault.tsx` | Fixed grid tracks `172px \| 1fr \| 188px`; `shrink-0` + explicit widths on nav/context columns |
| `app/globals.css` | `.app-page-shell--msg-vault` max-width `900px` → `1040px` |
| `components/ui/app-chrome.tsx` | `AppContentWrap` `min-[861px]:max-w-[1040px]` for three-zone room |
| `components/msg-vault/MsgVaultShell.tsx` | Overview hint: use left tabs or summary rows |

---

## Expected UX after fix

```
| LEFT (172px)          | CENTER (flex)        | RIGHT (188px)   |
| Overview/Chats/...    | Welcome / chat /     | Context rail    |
| tab + selectors       | notice detail        |                 |
```

1. Hard-refresh `/msg-vault`.
2. Confirm **vertical tabs** visible left of the white center card.
3. Click **Direct chats** (center row or **Chats** tab) → open contact or **+ New chat**.
4. If People is empty but count ≥ 1, check `GET /api/msg-vault/conversations?allowedContacts=1` and trust bonds (agent-87).

---

## Verification

```bash
npm run typecheck
```

Manual: `/msg-vault` at ≥861px viewport width — left nav + center + context all visible.
