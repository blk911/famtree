# Family Safe — Relationship Scenario Test Plan

Dev-only accounts created by `scripts/aihsafe/seed-relationship-scenarios.ts` (Agent 66).

**Password (all scenario users):** `RelationshipTest1!`

---

## Accounts

| Email | Age tier | Role | Primary test focus |
|---|---|---|---|
| `founder-parent@famtree.test` | adult | founder | Family steward — Members, Policies, Approvals |
| `child@famtree.test` | child | member | Minor — guarded posting, child shell |
| `teen@famtree.test` | teen | member | Minor — teen escalation, child shell |
| `guardian@famtree.test` | adult | member | Second guardian on child — Approvals inbox |
| `trusted-adult@famtree.test` | adult | member | Trusted-adult link from steward |
| `ceo@famtree.test` | adult | member | Business trust unit |
| `cfo@famtree.test` | adult | member | Business trust unit |
| `employee@famtree.test` | adult | member | Business trust unit |
| `peer@famtree.test` | adult | member | Peer trust unit |

---

## Seeded relationships

### Guardian links

| Guardian | Child / supervised | Kind | Permission |
|---|---|---|---|
| founder-parent | child | parent | approver |
| founder-parent | teen | parent | approver |
| founder-parent | trusted-adult | trusted_adult | approver |
| guardian | child | legal_guardian | approver |

### Family unit

- **Scenario Family (Agent 66)** — steward (guardian role), child, teen

### Trust units

| Name | Type | Members |
|---|---|---|
| Scenario Family Circle | FAMILY | founder-parent, child, teen |
| Scenario Executive Team | BUSINESS | ceo, cfo, employee |
| Scenario Peer Pod | peer / CLUB | founder-parent, guardian, peer |

---

## Manual test matrix

### 1. Parent → child

1. Log in as `founder-parent@famtree.test`
2. Open **Family Safe → Members** — confirm child under “Children & teens in your care”
3. Open **Approvals** — pending items from child actions (if any)
4. Log in as `child@famtree.test` — confirm only **Spaces** + **Activity** tabs
5. Attempt governed post in Activity — expect guardian approval path when policy requires

### 2. Parent → teen

1. Same as child, using `teen@famtree.test`
2. Confirm teen uses **child** shell (minor tier) in Family Safe

### 3. Guardian → child (second guardian)

1. Log in as `guardian@famtree.test`
2. **Members** — child listed under care
3. **Approvals** — can resolve escalations assigned to this guardian

### 4. Trusted adult

1. As founder-parent, **Members** — trusted adult row
2. As `trusted-adult@famtree.test` — verify read-only / appropriate shell (adult member)

### 5. CEO → CFO → employee (business)

1. Log in as `ceo@famtree.test`
2. **Spaces** — “Scenario Executive Team”
3. **Msg Vault** — start or open conversation within business circle (policy permitting)
4. Repeat spot-check as cfo / employee

### 6. Peer trust-unit members

1. Log in as `peer@famtree.test` or `founder-parent@famtree.test`
2. **Spaces** — “Scenario Peer Pod”
3. Confirm network members appear under **Members** without guardian controls (non-steward)

---

## Policy expectations

| Tier | Expected policy behavior |
|---|---|
| child / teen | Guardian approval for sensitive actions; restricted scopes |
| adult members | Standard member defaults from founder settings |
| unknown (no DOB) | Conservative — not used in this seed (all DOBs set) |

Re-run seed after founder settings change to refresh profiles:

```bash
npm run seed:aihsafe-scenarios:apply
```

(`ensurePolicyProfile` runs per user on apply.)

---

## Seed commands

```bash
# Preview
npm run seed:aihsafe-scenarios

# Write to DATABASE_URL
npm run seed:aihsafe-scenarios:apply
```

Production is blocked unless `ALLOW_AIHSAFE_SCENARIO_SEED=1`.

---

## Out of scope

- No UI test routes or admin panels for scenarios
- No revoke-link API tests (Remove remains disabled in UI)
- Does not replace `npm run db:seed` founder account (`admin@amihuman.net`)
