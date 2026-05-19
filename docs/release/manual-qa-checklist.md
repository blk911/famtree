# Manual QA Checklist — AIH Safe + Msg Vault RC

**Branch:** `aihsafe-agent-68-pre-merge-rc`  
**Password (scenario users):** `RelationshipTest1!`  
**Setup:** `npm run seed:aihsafe-scenarios:apply` then `npm run verify:aihsafe-scenarios` (expect 29/29)

---

## Environment

- [ ] Single `npm run dev` on http://localhost:3000 (no duplicate Node)
- [ ] Hard refresh after pull
- [ ] Founder fallback: `founder@famtree.test` / `password123` if needed

---

## A. Surface split (Dashboard / Msg Vault / Family Safe)

| # | Steps | Expected |
|---|--------|----------|
| A1 | Log in as `founder-parent@famtree.test` → `/dashboard` | Feed / awareness; **no** founder policy editor |
| A2 | Open **Msg Vault** from sidebar | Conversations, notices; governed send |
| A3 | Open **Family Safe** (`/aihsafe`) | Tabs: Overview, Spaces, Activity, Members, Approvals, **Policies & Settings** |
| A4 | Tab bar screen reader / inspect | `aria-label="Family Safe navigation"` |

---

## B. Family Safe — Members & governance (Agent 65)

| # | Steps | Expected |
|---|--------|----------|
| B1 | Founder → **Members** | Children/teens listed; Connect as guardian / Add trusted adult |
| B2 | Create trusted-adult link to existing member | Success toast; row updates |
| B3 | Remove / revoke link | Button **disabled** (no API) — documented gap |
| B4 | Log in as `child@famtree.test` → `/aihsafe` | Only **Spaces** + **Activity** tabs |
| B5 | Log in as `guardian@famtree.test` | Members + Approvals if guardian |

---

## C. Minor escalation (child / teen)

| # | Steps | Expected |
|---|--------|----------|
| C1 | `child@famtree.test` → Family Safe **Activity** → create post | Pending / approval required (not live until approved) |
| C2 | `founder-parent@famtree.test` → **Approvals** | Pending post appears |
| C3 | Approve or deny | Child sees updated state |
| C4 | Repeat spot-check as `teen@famtree.test` | Same escalation behavior |

---

## D. Msg Vault — messaging

| # | Steps | Expected |
|---|--------|----------|
| D1 | `ceo@famtree.test` → Msg Vault → start chat with CFO | Allowed (shared business TU) |
| D2 | `employee@famtree.test` → restricted thread not a member | Cannot access / friendly error |
| D3 | `child@famtree.test` → DM to `ceo@famtree.test` | **Blocked** (no relationship) |
| D4 | `child@famtree.test` → DM to `founder-parent@famtree.test` | **Allowed** (family circle) |
| D5 | Send message → refresh | Message persists |

---

## E. Dashboard private threads → vault

| # | Steps | Expected |
|---|--------|----------|
| E1 | `founder-parent@famtree.test` → `/dashboard` → Private Threads | Loads vault conversations (not legacy-only accordion) |
| E2 | Open thread from dashboard rail | Same conversation in Msg Vault when navigated |
| E3 | Activity CTA strip links | Points to Msg Vault / Family Safe appropriately |

---

## F. Trusted adult & unknown DOB

| # | Steps | Expected |
|---|--------|----------|
| F1 | `trusted-adult@famtree.test` → Family Safe | Member shell; no founder settings |
| F2 | Founder disables trusted adults in Policies → try new trusted-adult link | API/UI friendly rejection |
| F3 | `unknown-dob@famtree.test` | Member shell; cannot invite (`invite allowed=false`) |

---

## G. Regression smoke

| # | Steps | Expected |
|---|--------|----------|
| G1 | `/login` / logout | Session cookie works |
| G2 | `/invite` (authenticated) | Still protected |
| G3 | `/invite/[token]` (logged out) | Public identity challenge |
| G4 | Non-founder cannot reach `/admin` tools | Redirect or 403 |

---

## Sign-off

| Role | Name | Date | Pass / Fail |
|------|------|------|-------------|
| Dev QA | | | |
| Product | | | |

**Automated pre-check:** `npm run typecheck` · `npx next build` · `npm run verify:aihsafe-scenarios`
