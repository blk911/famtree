# Admin member delete — debug report

**Date:** 2026-05-19  
**Reporter:** Agent (admin QA)  
**Symptom:** Delete button on Admin → Members appears to do nothing for ashlyn wendt, preston wendt, spencer wendt (`@test.com` / `blk911@gmail.com`).

---

## Root cause (not “pre-wiring” alone)

The UI and API were **incomplete relative to the current schema**, not broken because those users registered early.

| Layer | Issue |
|--------|--------|
| **API** | `DELETE /api/admin/members` only removed `Invite` + `PasswordResetToken`, then `User.delete()`. |
| **Schema** | Agent 49+ added `AihMsgParticipant`, `AihMsgConversation.createdBy`, `AihMsgMessage.author`, AIH Safe rows, etc. with `onDelete: Restrict` on `User`. |
| **UI** | `handleConfirmMemberDelete` ignored non-OK responses — failures looked like a no-op. |

Prisma returned **FK violation (P2003)**; the modal closed only on success, so admins saw no feedback.

---

## Blockers found (local DB)

| Member | Msg participants | Convs created | Trust units | Family unit |
|--------|------------------|---------------|-------------|---------------|
| ashlyn@test.com | 2 | 0 | 1 | — |
| preston@test.com | 1 | 0 | 2 | — |
| spencer wendt (blk911@gmail.com) | 3 | **3** | 2 | created 1, member 1 |

Any one `AihMsgParticipant` or `AihMsgConversation.createdBy` row is enough to block the old delete.

Diagnostic script: `npx tsx scripts/debug-member-delete-blockers.ts [email...]`

---

## Fix applied

1. **`lib/admin/delete-member-account.ts`** — ordered cleanup:
   - Msg Vault governance events, messages, participants, notices
   - Reassign or delete conversations the user created
   - AIH Safe activity, approvals, guardian links, family units
   - Invites, sessions, password resets, then user
2. **`app/api/admin/members/route.ts`** — uses helper; returns **409** with message on remaining FK conflicts
3. **`components/admin/AdminLists.tsx`** — shows API error in delete modal

---

## How to verify

1. Admin → Members → Delete on one of the three test accounts
2. Confirm modal completes and row disappears
3. Re-run `scripts/debug-member-delete-blockers.ts` — should report NOT FOUND

---

## Out of scope

- Soft-delete / archive instead of hard delete
- Deleting members who still own **Studio** rows (separate `Studio.owner` cascade exists; not expanded here)
- Production run without backup
