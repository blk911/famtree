# Recovery branch â€” Trust / Bond / Trust Unit status

**Purpose:** Snapshot of the recovered codebase state so work continues safely without assuming `main` contents match local experimentation.

## Branch & HEAD

| Item | Value |
|------|--------|
| **Branch** | `recovery-famtree-trust-units-working` |
| **Latest commit** | `908958359709d20092b75bc904ba0b580448dc40` |

## Trust / Bond / Trust Unit â€” implemented behavior

- **Schema:** `trust_units`, `trust_unit_members`, `trust_unit_requests`, `trust_unit_request_members`, `trust_unit_approvals`, `trust_unit_request_pending_invites`, `connection_requests`, `invites` (plus core `users`, `profiles`, posts, etc.).
- **Engine:** `lib/trust/index.ts` (pending TU fetch, heal approvals, auto-decline legacy sponsor-only-star triplets, bonds, active units), `lib/trust/adjacency.ts`, `lib/trust/tuProposal.ts` (auto TU on outbound invite, resolve pending invite on register).
- **Invite path:** `POST /api/invite` runs auto-TU proposal **before** email send so mail failures donâ€™t skip TU creation.
- **Register path:** Sponsor bond upsert + `resolveTrustUnitPendingInvitesOnRegister` when invite completes.
- **Wedge detection:** `findTrustUnitOpportunityConnectors` filters pure shared-sponsor hub false positives for `check-opportunity`.
- **Bond (memberâ†’member):** `POST /api/connections/create-request` upserts **`ACCEPTED`** so adjacency and Private Feed bonds arenâ€™t stuck `PENDING` without an accept UI.
- **UI:** Dashboard + admin TU gate (`DashboardTrustUnitGate`), invite flow TU modal (`TrustUnitModal`), family vault Units + Private Feed (`PrivateFeedClient`), tree `TrustUnitCard`.

## Known working routes (pages)

- `/dashboard` â€” member home; pending TU modal/cards (members).
- `/admin` â€” founders/admins; includes same TU gate as dashboard.
- `/invite` â€” send invites; existing-email lookup â†’ TU opportunity or connection flow.
- `/family-vault/family-units` â€” forming + live trust units + bonds summary.
- `/family-vault/private` â€” TU threads (`?unit=`), bond DM threads (`?peer=`).
- `/tree` â€” tree + active TU cards with link to private feed.

## Known backend routes (Trust/Bond/TU-related)

| Method | Path |
|--------|------|
| POST | `/api/trust/check-opportunity` |
| POST | `/api/trust/create-request` |
| POST | `/api/trust/respond` |
| POST | `/api/invite` |
| GET / POST | `/api/invite/[token]` |
| POST | `/api/auth/register` |
| POST | `/api/connections/create-request` |

## Local DB warning

**Local Postgres often has more users, invites, and graph edges than production / hosted DB.** Schema drift or â€œrecoveryâ€ testing can make local data richer or messier than online.

- Do **not** assume `prisma db push` / seed / dump-restore against production without an explicit migration plan.
- Treat **`users`**, **`invites`**, **`trust_unit_*`**, **`connection_requests`**, **`sessions`** as **sensitive graph + identity data**.

## Do-not-overwrite warning

- **`main`** is the production comparison baseline â€” **do not force-push or blindly merge** without a reviewed PR.
- **Never replace production DB** from local dumps without a controlled migration and backups.
- **Do not bulk-delete** sessions/users/invites as â€œcleanupâ€ during code merges.

## Manual test sequence (smoke)

1. Log in as member â†’ `/dashboard` â€” pending TU UI if applicable.
2. `/invite` â€” send invite to **new** email â†’ TU auto proposal exists even if email provider fails (502 path).
3. Existing member email â†’ TU modal **or** connection success â†’ refresh â†’ bond/TU reflected where expected.
4. Register invitee â†’ sponsor bond + pending TU slot resolution if present.
5. Accept/decline TU on dashboard â†’ active TU appears under Units + `/family-vault/private?unit=`.
6. Bond thread: `/family-vault/private?peer=` from Units bond rows.

## Remaining weak points

- **Bond consent:** Connection creation is **immediate `ACCEPTED`** (no pending/review UI). Add `/api/connections/respond` + UI if two-party approval is required.
- **ESLint:** `npm run lint` may prompt interactive Next ESLint setup until configured.
- **Windows:** `npx prisma generate` can hit **EPERM** on `query_engine-windows.dll.node` â€” stop Node processes and retry.
- **Stale `connection_requests`:** Rows stuck `PENDING` **before** the ACCEPT upsert fix may need one-off SQL or a repeat POST to same pair.

## Next recommended cleanup tasks

1. Open **PR**: `recovery-famtree-trust-units-working` â†’ `main` (compare only; merge only after review).
2. Document **optional** connection-request accept flow if product wants explicit consent.
3. Add **ESLint config** non-interactively for CI (`npm run lint`).
4. Align **production deploy checklist** with `docs/recovery-merge-plan.md`.
5. Optional **data audit script** (read-only) to compare counts between envs â€” never run destructive SQL without backup.
