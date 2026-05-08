# Debug / repair — sponsor bonds & TU adjacency (May 2026)

## Symptom

Some members showed Trust Units / graph neighbors correctly while **Family Units**, **Private Feed** bond threads, and **bond lists** omitted pairs that clearly existed via the invite tree (including sponsor ↔ Spencer-class fixtures tied to alternate inbox domains).

## Root causes found

1. **`getAcceptedBondDetails` used only `connection_request`**  
   Adjacency (`buildTrustAdjacency`) already counted REGISTERED/ACCEPTED **invite** edges, but UI listing bonds (`family-units`, `PrivateFeedClient`) called **`getAcceptedBondDetails`**, which ignored invites — legacy rows never got an ACCEPTED connection upsert at registration.

2. **Invite `recipientEmail` vs live `users.email` drift**  
   If an account email changed after invite creation (e.g. fixture moved off `@test.com`), invite rows still pointed at the **old** address. Invite-based lookup failed; **`invitedById` on `users` was still correct** but was **not** wired into adjacency.

## Code fixes (merged into app logic)

| Area | Change |
|------|--------|
| `lib/trust/index.ts` — `getAcceptedBondDetails` | Merges peers from ACCEPTED/REGISTERED **invites**, **`invitedById`** sponsor edges, and **`connection_request`**, deduped by peer id (connection row wins when present). |
| `lib/trust/adjacency.ts` — `buildTrustAdjacency` | Adds **`invitedById` sponsor ↔ member** edges; invite email resolution uses **`normalizeInviteEmail`** consistently with the rest of the app. |
| `lib/trust/adjacency.ts` — `pickNeighborForAutoTrustUnit` | After downhill **connection** preference, prefers neighbors matching outbound REGISTERED/ACCEPTED **invites** from the sponsor (same downhill semantics without requiring a row). |

## Database hygiene (optional, environment-specific)

Scan sponsor-implied bonds vs `connection_requests`:

```bash
npm run bonds:scan
```

Upsert missing sponsor→member ACCEPTED rows (run only on DBs you own — **never** against production without backup + review):

```bash
npm run bonds:fix
```

Script: `scripts/scan-sponsor-bonds.ts`.

**Residual class:** `invite_unresolved_email` — invite still lists an address with **no matching user**. Fix by aligning `invites.recipientEmail` to the member’s canonical email **or** rely on `invitedById` + code paths above; optional SQL/update via admin tooling.

## Verification checklist

1. `npm run typecheck`
2. Log in as affected sponsor / member → `/family-vault/family-units` bond strip lists expected peers.
3. `/family-vault/private` shows bond DM buckets for those peers.
4. Re-run `npm run bonds:scan` — expect **zero** `invite_missing_connection` / `invitedBy_missing_connection` after `bonds:fix` on that DB; unresolved-invite rows need manual email alignment if still reported.

## Scope note

This repair touches **local/dev validation data only** in Git — **no user renaming**, **no production merge of rows**. Production deployments still follow `docs/code-only-merge-checklist.md`; run **`bonds:scan` / `bonds:fix`** separately per environment if gaps appear.
