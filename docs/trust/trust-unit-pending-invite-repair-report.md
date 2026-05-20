# Trust Unit — rogue pending invite slot

## Symptoms (reported)

1. Pending masked email (`t***@g***`) on **Trust Unit Request** on dashboard/admin, not in **Admin → Invites** table.
2. Invitee cannot complete identity challenge — **sponsor has no photo**.
3. Sponsor did not send the invite — not in **their** sent-invite list.

## Route / data path

```
POST /api/invite
  → routeInviteByIntent (allowAutoTrustUnit for adult_friend | family_adult)
  → tryAutoTrustUnitAfterInvite(senderId, inviteId)   [lib/trust/tuProposal.ts]
  → TrustUnitRequest + TrustUnitRequestPendingInvite + Invite row

GET /dashboard | /admin
  → getPendingTrustRequestsSafe(userId)
  → repairStalePendingTrustProposals()   [lib/trust/repairPendingProposals.ts]
  → getPendingTrustRequests(userId)
  → DashboardTrustUnitGate → TrustRequestCard
```

**Why admin Invites may not show it:** `AdminLists` loads the last 50 site-wide invites. A TU slot can reference an invite that is older, expired, or attached to a proposal where the **viewer is a member** but not the **sender** (sent list is `listSentInvitesForSender` only).

**Why masked email appears:** `maskInviteEmail()` in `getPendingTrustRequests` — full email only for the **proposal creator** after `serializeTrustGateRequests(..., viewerUserId)`.

## Repair rules (`repairStalePendingTrustProposals`)

| Issue | Action |
|--------|--------|
| Orphan slot (invite deleted) | Remove slot |
| Invite sender ≠ proposal creator | Remove slot (corruption) |
| Invite EXPIRED / CANCELLED | Remove slot |
| Invite past `expiresAt` | Mark EXPIRED, remove slot |
| Invite REGISTERED but still slotted | Promote to member or remove slot |
| Creator has no `photoUrl` | Remove slot (invitee cannot verify) |
| &lt; 3 participants after cleanup | Decline entire `TrustUnitRequest` (status `DECLINED`) |

## Prevention

`tryAutoTrustUnitAfterInvite` now returns early when the sender has no `photoUrl`.

## Ops

```bash
# Audit (local or prod DATABASE_URL)
npm run trust:repair-pending

# Apply repairs
npm run trust:repair-pending:apply
```

After deploy, opening dashboard/admin runs repair automatically once per request load.
