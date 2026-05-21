# Studio ↔ AIH Boundary Map

What lives where today, what duplicates risk, and what must converge.

---

## AIH Core (source of truth)

| Domain | Location | Owns |
|--------|----------|------|
| Identity | `User`, `Profile`, `lib/auth`, sessions | Login, profile fields, photos |
| Invite graph | `Invite`, `app/api/invite/*`, `lib/invite` | Email invites, identity challenge, registration |
| Tree / parent link | `User.invitedById`, dashboard tree | Famtree lineage |
| Trust spaces | `TrustUnit`, `FamilyUnit`, `app/api/aihsafe/*` | Governed membership, leave, create |
| Msg Vault | `AihMsg*`, Msg Vault UI, `types/aihsafe/vault-trust-space.ts` | Private threads, notices, governance |
| Policy / boundaries | Policy profiles, Msg Rules, guardian | Who can message whom |
| Dashboard spaces | `DashboardSpace`, `DashboardSpaceKind` | **Post scope** (BUSINESS/CLUB/CHURCH) — not studio preview |

---

## Studio layer (presentation + scaffolding)

| Asset | Location | Owns today |
|-------|----------|------------|
| Public routes | `app/studios/*` | Marketing shell, slug pages, start editor |
| Builder UI | `components/studios/**`, `TrainerStudioShell` | Hero triad, sections, publish preview UX |
| Templates | `lib/studio/templates/*` | Neutral/fitness envelopes, normalize |
| Types (marketing) | `types/studios.ts` | `Provider`, `StudioOffer`, relationship **types only** (mostly unused in DB) |
| DB Studio | `prisma` `Studio`, `StudioServiceTier`, `StudioVoiceProfile` | Slug, owner, tiers, concierge context |
| Concierge | `ConciergeChatSession`, `app/api/concierge/*` | Visitor chat + lead capture — **not** member messaging |
| Mock directory | `lib/studios/mockStudios.ts` | Demo providers for `/studios/[slug]` |
| Pvt net placeholder | `/studios/pvt-net-login` | Not wired to Msg Vault |

---

## Duplication risks (do not extend)

| Risk | Current state | Correct owner |
|------|---------------|---------------|
| **Parallel invites** | Studio nav “PVT CLIENT NETWORK” / future studio invite | AIH `Invite` + Space-scoped `trustUnitId` / `familyUnitId` |
| **Parallel messaging** | Concierge vs Msg Vault naming confusion | Concierge = public lead; Msg Vault = members |
| **Parallel identity** | `Provider` mock shape vs `User` | User + Profile; Provider is view model |
| **StudioRelationship types** | `types/studios.ts` only | Membership = TrustUnitMember / FamilyUnitMember |
| **Separate “Studio inbox”** | `app/(app)/studios/inbox` | Concierge sessions for **owned slugs** — rename/clarify as concierge ops, not member chat |
| **DashboardSpace vs Space** | Two “space” words | Document; merge naming in future schema pass |
| **localStorage studio draft** | Hero/contact/intro/proof drafts | Until FK to Space, OK for editor prototype only |

---

## What should move under Spaces

| Today (Studio-local) | Move to |
|----------------------|---------|
| Member network access | TrustUnit / FamilyUnit membership |
| Invite prospects | `POST /api/invite` with space scope |
| Private updates / threads | Msg Vault (`vaultSpaceType`, thread scope) |
| Steward list / roles | TrustUnit roles + founder governance |
| “Who can see this” | Visibility rules + policy profile |

---

## What should remain Studio-specific

| Concern | Why |
|---------|-----|
| Public slug URL | SEO/branding (`/studios/[slug]`) |
| Hero triad + template copy | Marketing presentation |
| Service tier **cards** | Commercial packaging display |
| Map / location block | Public anchor (address still stored on Profile/Space meta later) |
| Publish preview / editor chrome | Builder UX |
| Concierge (optional) | Pre-membership lead capture on public page |

---

## Role mapping

| Studio label | AIH / Space mapping |
|--------------|---------------------|
| Studio Owner | Space steward — `User` owner of `Studio`; TrustUnit creator (future); `SystemRole` founder/admin for network |
| Studio Admin | Space moderator — `TrustUnitRole.MODERATOR` (reserved); founder settings delegate |
| Studio Member | `TrustUnitMember` / `FamilyUnitMember` active |
| Guest / Prospect | Unauthenticated or pre-invite; AIH invite pipeline only |

No `StudioMember` table — use existing membership tables.

---

## API boundaries today

| Studio needs | Use |
|--------------|-----|
| Create member access | `POST /api/invite` (+ space ids when schema ready) |
| List pending | `listInvites` (aihsafe apiClient) |
| Member messaging | Msg Vault APIs — **do not** add `/api/studios/messages` |
| Publish page data | `Studio` + presentation JSON (future); today mock + partial DB load |

---

## Agent 92 code touchpoints (minimal)

- `lib/studios/publishedSpaceBridge.ts` — shared copy/URLs
- `components/studios/StudiosSpacesPoweredNote.tsx` — editor bridge
- `components/aihsafe/spaces/SpacesTab.tsx` — Create Published Studio CTA
- `lib/aihsafe/space-creation-types.ts` — documented option list

**No Prisma changes** in Agent 92.
