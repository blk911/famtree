# Agent 66 — Family Safe Relationship Test Harness

**Branch:** `aihsafe-agent-66-relationship-test-harness`  
**Date:** 2026-05-19  
**Scope:** Dev-only seed script + documentation for relationship/governance QA. No production UI, no schema changes.

---

## Summary

Added an idempotent CLI seed that provisions nine scenario users, guardian links, one family unit, three trust units, founder settings, and policy profiles. Default execution is **dry-run**; **`--apply`** writes to `DATABASE_URL`.

---

## Files created

| File | Purpose |
|---|---|
| `scripts/aihsafe/seed-relationship-scenarios.ts` | Seed / dry-run harness |
| `docs/aihsafe/relationship-scenario-test-plan.md` | Manual QA matrix |
| `docs/aihsafe/agent-66-relationship-test-harness-report.md` | This report |

## Files modified

| File | Change |
|---|---|
| `package.json` | `seed:aihsafe-scenarios` and `seed:aihsafe-scenarios:apply` npm scripts |

---

## Users seeded (on `--apply`)

| Key | Email | Role | DOB intent |
|---|---|---|---|
| founderParent | founder-parent@famtree.test | founder | adult |
| child | child@famtree.test | member | ~10y → child tier |
| teen | teen@famtree.test | member | ~16y → teen tier |
| guardian | guardian@famtree.test | member | adult |
| trustedAdult | trusted-adult@famtree.test | member | adult |
| ceo | ceo@famtree.test | member | adult |
| cfo | cfo@famtree.test | member | adult |
| employee | employee@famtree.test | member | adult |
| peer | peer@famtree.test | member | adult |

**Password:** `RelationshipTest1!` (printed after run)

Emails use `@famtree.test` for valid dev login; local-part matches the Agent 66 spec (`child@test` → `child@famtree.test`).

---

## Relationships seeded

- **Guardian links:** parent→child, parent→teen, parent→trusted_adult, legal_guardian→child
- **Family unit:** Scenario Family (Agent 66)
- **Trust units:** Family circle, Executive Team (business), Peer Pod
- **Founder settings:** `id=singleton`, `enableTrustedAdults: true`
- **Policy profiles:** `ensurePolicyProfile()` per user (age-tier defaults + founder settings)

`child` and `teen` get `invitedById` → founder-parent for tree consistency.

---

## Dry-run / apply behavior

| Mode | Command | Behavior |
|---|---|---|
| Dry-run (default) | `npm run seed:aihsafe-scenarios` | Lists planned actions; no DB writes |
| Apply | `npm run seed:aihsafe-scenarios:apply` | Upserts users, links, units, policies |

**Production guard:** exits unless `ALLOW_AIHSAFE_SCENARIO_SEED=1` when `NODE_ENV=production`.

---

## Auth / dev bypass

No new bypass. Sign in at `/login` with scenario emails and shared password. Existing seed founder (`admin@amihuman.net` / `whisper` from `npm run db:seed`) remains separate.

---

## Test plan

See [relationship-scenario-test-plan.md](./relationship-scenario-test-plan.md).

---

## Validation results

| Command | Result |
|---|---|
| `npx tsx scripts/aihsafe/seed-relationship-scenarios.ts` (dry-run) | **Pass** |
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** (retry after transient `.next` cache error) |

---

## Not included

- HTTP test API or admin UI for seeding
- Revoke guardian link (no API)
- Assign guardian B→child C without B signing in (API limits guardian to actor)
- Automatic cleanup / teardown script (re-run is idempotent by email)
