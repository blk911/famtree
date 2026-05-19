# Agent 65 — Family Safe Members Governance UI

**Branch:** `aihsafe-agent-65-members-governance-ui`  
**Date:** 2026-05-19  
**Scope:** Operational Members tab for guardian / trusted-adult relationship management using existing APIs only.

---

## Summary

The **Members** tab (`PeopleTab`) now supports founder/admin **create** flows for guardian and trusted-adult links, clearer section labels, and read-only directory views for guardians and members. **Revoke/remove** is documented as unsupported — UI shows a disabled **Remove** control with explanatory tooltip.

---

## Files modified

| File | Change |
|---|---|
| `components/aihsafe/common/apiClient.ts` | `createGuardianLink()` helper |
| `components/aihsafe/people/memberCandidates.ts` | **New** — build picker list from family + trust units |
| `components/aihsafe/people/GuardianLinkModal.tsx` | **New** — create-link modal (guardian + trusted adult modes) |
| `components/aihsafe/people/LinkRowActions.tsx` | **New** — disabled Remove button (revoke not in API) |
| `components/aihsafe/people/PersonRow.tsx` | Optional `actions` slot |
| `components/aihsafe/people/PeopleTab.tsx` | Sections, founder actions, guardian banner, modal wiring |
| `components/aihsafe/founder/FounderShell.tsx` | Pass `onReload={load}` to `PeopleTab` |
| `docs/aihsafe/agent-65-members-governance-ui-report.md` | This report |

---

## Controls added

### Founder / admin (`shellMode === "founder"`)

| Control | API | Notes |
|---|---|---|
| **Connect as guardian** | `POST /api/aihsafe/guardian-links` | Current user becomes guardian; pick person, role (parent / grandparent / legal guardian), permission level |
| **Add trusted adult** | Same POST with `kind: trusted_adult` | Respects `enableTrustedAdults` founder setting |
| **Remove** (per row) | — | Disabled; see unsupported actions |
| **Invite someone** | Existing `/invite` link | Unchanged |

### Guardian member (`shellMode === "member"` + active guardian links)

- Read-only sections: children & teens in your care, trusted adults, your guardians (if any)
- Green info banner pointing to **Approvals** tab
- No create or remove controls

### Adult member (non-guardian)

- Read-only: family stewards, family members, network members, pending invites
- No relationship create controls

### Child / teen

- **Members** tab hidden by nav (`getVisibleTabs` — unchanged)
- No UI work required

---

## Members tab sections

| Section | Who sees it | Content |
|---|---|---|
| Family steward | Founder | Stewardship banner + friendly copy |
| Guardian banner | Guardian member | Pointer to Approvals |
| Action buttons | Founder | Connect as guardian · Add trusted adult |
| Children & teens in your care | Guardian links (non–trusted-adult) | Name, role badges, permission |
| Trusted adults | `kind === trusted_adult` links | Same row pattern |
| Your guardians | Links where you are the child | Read-only for minors/guardians |
| Family stewards | Family unit `role: guardian` | Directory from family units (not guardian-link table) |
| Family members | Family unit roster | |
| Network members | Trust-unit overlap | |
| Pending invites | Pending AIH invites | |

---

## Role visibility

| Capability | Founder/Admin | Guardian member | Adult member | Child/teen |
|---|---|---|---|---|
| View Members tab | Yes | Yes | Yes | No (tab hidden) |
| Create guardian link | Yes | No | No | No |
| Create trusted adult link | Yes | No | No | No |
| Remove link | Disabled UI | No | No | No |
| View managed children | If linked | If linked | No | N/A |
| Policies & Settings | Other tab | No | No | No |

---

## Unsupported actions (API gaps)

| Action | Status | UI behavior |
|---|---|---|
| **Revoke / remove guardian link** | No `DELETE` or `PATCH` on `/api/aihsafe/guardian-links` | Disabled **Remove** + tooltip |
| **Assign another user as guardian** | POST always sets `guardianUserId` to current user | Modal explains other adults must sign in or use invite |
| **Update permission level** | `UpdateGuardianLinkRequest` in types only; no route | Not exposed |
| **List all network guardian links** | GET scoped to actor as guardian or child | Cannot show third-party A↔B links in UI |

---

## API usage

```http
POST /api/aihsafe/guardian-links
{
  "childUserId": "<uuid>",
  "kind": "parent" | "grandparent" | "legal_guardian" | "trusted_adult",
  "permissionLevel": "view_only" | "approver" | "full_control"
}
```

```http
GET /api/aihsafe/guardian-links
```

Picker candidates: active members of family units + trust units (excluding self).

---

## Copy guidelines applied

- “Family steward,” “approved circle,” “trusted adults,” “children & teens in your care”
- Avoided surveillance framing
- Guardian modal notes cooperative paths for other adults (sign-in / invite)

---

## Validation results

| Command | Result |
|---|---|
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** (after clearing stale `.next`) |

---

## Recommended follow-ups (out of scope)

1. `DELETE /api/aihsafe/guardian-links/[id]` or `PATCH` revoke — wire **Remove** button
2. Founder assign guardian B → child C (requires API allowing `guardianUserId` ≠ actor)
3. `PATCH` permission level for existing links
