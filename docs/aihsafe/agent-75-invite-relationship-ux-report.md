# Agent 75 — Invite / Relationship UX Cleanup Report

**Branch:** `aihsafe-agent-75-invite-relationship-ux`  
**Date:** 2026-05-19  
**Scope:** User-facing invite language only. No schema, API, or Dashboard / Family Safe / Msg Vault redesign.

---

## Summary

The `/invite` compose flow now uses **five plain-language invite types** with short explanations, intent-specific email subjects and preview copy, and the required child/teen steward and Boundaries messaging. Internal terms (`inviteIntent`, founder, policy) stay in code/API only.

---

## Files modified

| File | Change |
|------|--------|
| `components/invite/inviteUxCopy.ts` | **New** — labels, descriptions, subjects, checklists, API intent mapping |
| `app/(app)/invite/InviteClient.tsx` | Invite kind chips, helper copy, confirm modal, email preview |
| `app/(auth)/register/page.tsx` | Minor-invite subcopy about Boundaries on signup |
| `docs/aihsafe/agent-75-invite-relationship-ux-report.md` | This report |

---

## Labels changed

| Before | After |
|--------|--------|
| Adult (dropdown) | **Friend / trusted contact** |
| (implicit adult) | **Family member** (with relationship picker) |
| Child or teen | **Child or teen** (unchanged label, expanded copy) |
| — | **Trusted adult** (new visible option) |
| Business colleague | **Work / business member** |
| Frnd (relationship chip) | **Friend** |
| ＋ tag | ＋ relationship |
| I am parent/guardian/steward | **Are you this child's parent, guardian, or family steward?** |
| Subject: "join my family" (all) | Per-kind subjects (connect, family network, Boundaries, trusted adult, work space) |

---

## Child / teen copy

- **Steward checkbox:** “Are you this child's parent, guardian, or family steward?”
- **Boundaries note:** “Children and teens join with Boundaries turned on by default. You will help guide their trusted spaces and visibility.”
- **Confirm checklist:** Boundaries on by default; steward recorded on signup
- **Register page:** “Children and teens join with Boundaries on by default.” when `isMinorInvite` from API

---

## Business copy

- **Kind description:** “Work members join a workspace relationship, not a family role. They will not manage family Boundaries or children.”
- **Italic reminder** under business selection (same sentence as spec)
- **Confirm checklist:** work space, not family role
- **Email subject:** “You've been invited to a work space on AMIHUMAN.NET”

---

## Other distinctions (user-facing)

| Kind | User sees |
|------|-----------|
| Friend / trusted contact | Sponsor contact only; not a family manager |
| Family member | Adult in family network; pick relationship |
| Trusted adult | Adult supporter; link family members after join |
| Child or teen | Boundaries + steward declaration required |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |

---

## Not changed

- Prisma schema / `relationship` enum values
- `POST /api/invite` contract (still uses `inviteIntent` from UI mapper)
- Dashboard, Msg Vault, Family Safe shells
- Admin-only invite list actions
