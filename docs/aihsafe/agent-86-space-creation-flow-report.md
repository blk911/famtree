# Agent 86 — Trusted Space / Family Group Creation Flow

**Branch:** `aihsafe-agent-86-space-creation-flow`  
**Mission:** Replace floating status pills and dropdown-first creation with guided container → type → people flows.

---

## 1. Files modified

| File | Change |
|------|--------|
| `components/aihsafe/founder/VaultHero.tsx` | Removed floating pills + hero create CTA (`VaultHeroToolbar` returns null) |
| `components/aihsafe/founder/FounderShell.tsx` | New modals; no hero toolbar; rail gets activity stat |
| `components/aihsafe/spaces/SpacesTab.tsx` | Section CTAs, improved empty states, removed top floating create bar |
| `components/aihsafe/spaces/TrustedSpaceCreateFlow.tsx` | **New** — 4-step trusted space wizard |
| `components/aihsafe/spaces/FamilyGroupCreateFlow.tsx` | **New** — 3-step family group wizard |
| `components/aihsafe/spaces/PeopleSelector.tsx` | **New** — trusted network checkboxes |
| `components/aihsafe/spaces/CreateFlowSteps.tsx` | **New** — shared step chrome |
| `components/aihsafe/spaces/buildTrustedNetwork.ts` | **New** — members + guardian/trusted adults |
| `lib/aihsafe/space-creation-types.ts` | **New** — user-facing type labels → `VaultSpaceType` |
| `lib/trust/display.ts` | Split empty title/hint/subhint copy |
| `components/aihsafe/common/apiClient.ts` | `createFamilyUnit` accepts optional `memberIds` (API already supported) |
| `components/context-rail/profiles/GovernanceRailProfile.tsx` | Status rail card (invites, activity, approvals, notices) |
| `components/context-rail/FamilySafeContextLayout.tsx` | Pass `recentActivityDisplay` |
| `components/context-rail/types.ts` | Extended props |
| `app/globals.css` | `.aihsafe-spaces-*`, `.aihsafe-create-flow_*` |

**Unchanged but superseded in modals:** `TrustUnitCreatePanel`, `FamilyCreatePanel` (still in repo for other entry points if any).

---

## 2. Removed floating pills

Under the Family Safe hero:

- Removed **“N pending invites”** and **“N recent activity”** pills.
- Removed hero-level **“+ Create Trusted Space”** button.

Status now lives in the **right rail Status** section and **Needs attention** block. Creation CTAs live in **Spaces** section headers and empty states.

---

## 3. Trusted Space flow

**Entry:** `+ Trusted Space` in Trusted Spaces section (header + empty state) or overview/suggested actions (existing).

**Modal steps (`TrustedSpaceCreateFlow`):**

1. **Space name** — examples: Soccer Parents, My House, Work Pod  
2. **Space type** — Family, Peer, Work, Guardian, Private Group (maps to `VaultSpaceType`)  
3. **Add people** — checkbox list from trusted network; pending invites listed as context; optional “Invite someone new” (email sent after create, scoped to new space)  
4. **Review & create** — `createTrustUnit` with `memberIds`; optional `sendInvite` with `trustUnitId`

---

## 4. Family Group flow

**Entry:** `+ Family Group` (founder/admin only).

**Modal steps (`FamilyGroupCreateFlow`):**

1. **Family group name**  
2. **Add members** — same trusted network selector; optional invite email  
3. **Review & create** — `createFamilyUnit(name, { memberIds })`; optional `sendInvite` with `familyUnitId`

---

## 5. Existing people selector behavior

- Source: `buildTrustedNetwork()` = space/family members via `buildMemberCandidates` + active `guardianLinks` (children, guardians, trusted adults).
- Excludes self; no public search or strangers.
- Pending invites shown as read-only context (“joins when they accept”), not as fake members.
- New invite email only fires **after** container is created, tied to that space/group.

---

## 6. Right rail updates

`GovernanceRailProfile` adds **Status** card:

- Pending invites count  
- Recent activity count (from activity feed load in shell)  
- Approvals waiting (founder/guardian)  
- Unread Msg Vault notices when > 0  

Existing **Needs attention**, governance meta, recent invites, people nearby, quick actions, and Msg Rules sections retained.

---

## 7. Empty state updates

| Location | Copy |
|----------|------|
| Trusted Spaces (empty) | **No trust circles yet.** + Create one for family, friends, work, or private groups. + `[ + Trusted Space ]` |
| All-empty footer | **No trust circles yet.** + Invite someone or create a trusted space to get started. |
| Family Groups | No family groups yet. + `[ + Family Group ]` |
| Pending invites | Softer “outstanding invites” wording |

---

## 8. Remaining gaps

- **TrustUnitCreatePanel** still uses raw user-ID textarea if opened elsewhere; modals now use the wizard only from Family Safe shell.
- **Pending invites** cannot be pre-attached to a space before acceptance (by design — invite sent after create).
- **Member role labels** in trust units remain generic “member” (schema limitation).
- **Description field** dropped from wizard to keep flow light (optional API field unused).
- **Child/teen** cannot create spaces — unchanged governance.

---

## 9. Validation results

```text
npm run typecheck  — PASS
npx next build     — PASS
```

---

## Safety

- No Prisma schema changes.  
- No new API routes.  
- No public discovery.  
- Child shell unchanged (read-only approved circles).  
- Creation gated to founder shell mode (founder/admin roles).
