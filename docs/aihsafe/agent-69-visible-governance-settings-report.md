# Agent 69 — Visible Family Governance Settings Report

**Branch:** `aihsafe-agent-69-visible-governance-settings`  
**Date:** 2026-05-19  
**Scope:** Show Family Safe settings to all roles; edit remains founder/admin only.

---

## Summary

Family Safe **Policies & Settings** (or **Family Settings** for minors/members) is now visible in the tab bar for every shell mode. Founders/admins keep the editable `FounderSettingsEditor`. Everyone else sees a read-only `FamilySettingsView` backed by `GET /api/aihsafe/family-governance` (family singleton + caller’s resolved policy).

---

## Files modified

| File | Change |
|------|--------|
| `components/aihsafe/navigation/FamilySafeTabs.tsx` | Settings tab for all modes; role-specific label |
| `components/aihsafe/founder/FounderShell.tsx` | Settings panel for all roles; tab fallback; guardian tab detection fix |
| `components/aihsafe/founder/FounderSettingsEditor.tsx` | Title/copy: “Family Settings”, softer section headers |
| `components/aihsafe/founder/FamilySettingsView.tsx` | **New** read-only settings UI |
| `components/aihsafe/roles/governanceView.ts` | **New** tab labels + audience helpers |
| `components/aihsafe/common/apiClient.ts` | `getFamilyGovernance()` |
| `app/api/aihsafe/family-governance/route.ts` | **New** read API for all authenticated users |
| `types/aihsafe/dto.ts` | `FamilyGovernanceViewDTO`, `PersonalGovernanceDTO` |

---

## Role tab visibility

| Shell | Tabs |
|-------|------|
| **Founder/Admin** | Overview · Spaces · Activity · Members · Approvals · Policies & Settings |
| **Member + guardian** | Overview · Spaces · Activity · Members · Approvals · Family Settings |
| **Member (adult)** | Overview · Spaces · Activity · Members · Family Settings |
| **Child/Teen** | Spaces · Activity · Family Settings |

Approvals remain hidden for non-guardian / non-founder. Members tab remains hidden for child shell.

---

## Editable vs locked behavior

| Role | Settings UI | Can save |
|------|-------------|----------|
| Founder/Admin (`shellMode=founder`) | `FounderSettingsEditor` | Yes — `PATCH /api/aihsafe/founder-settings` |
| Guardian (member shell) | `FamilySettingsView` | No — read-only (no new PATCH rights) |
| Adult member | `FamilySettingsView` | No |
| Child/Teen | `FamilySettingsView` | No — softer steward copy |
| UNKNOWN DOB (member shell) | `FamilySettingsView` | No — conservative member view |

---

## Settings shown (read-only)

**Your participation (resolved policy):**

- Posting allowed  
- Guardian approval for your posts  
- Default visibility  
- Daily post limit  
- Daily invite limit  

**Family-wide (founder singleton):**

- Guardian approval for minors  
- Minor posting  
- Trusted adults  
- Private trusted spaces  
- Default visibility (family)  
- External links (family rule; noted as applied where supported)

---

## Fields omitted (not fake enforcement)

| Field | Reason |
|-------|--------|
| Approved interest categories | Founder allowlist is localStorage-only today — listed in footnote only |
| Per-category toggles | Not server-backed |
| `allowMinorInvites` (family) | Omitted from read-only list to reduce clutter; still in founder editor |
| Surveillance / policy-engine language | Avoided in all copy |

---

## Copy rules

Used: Family Settings, trusted spaces, guardian approval, family steward, view only.  
Avoided: policy engine, surveillance, restriction dashboard, admin controls (child view).

---

## Safety

- `PATCH /api/aihsafe/founder-settings` unchanged — founder/admin only.  
- New `GET /api/aihsafe/family-governance` — any authenticated user; read-only.  
- UI hiding is not authorization; API gates unchanged.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Pass** |
| `npx next build` | **Pass** |

---

## Manual check

1. Log in as `child@famtree.test` → Family Safe → **Family Settings** tab visible, all rows read-only.  
2. Log in as `founder-parent@` or founder → **Policies & Settings** editable.  
3. Log in as adult member → Family Settings visible, no save toggles.
