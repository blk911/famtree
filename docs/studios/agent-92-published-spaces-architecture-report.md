# Agent 92 — Studios as Published Spaces Architecture Report

**Branch:** `studios-agent-92-published-spaces-architecture`  
**Mission:** Define Studios as the **published/branded layer** on AIH Spaces — audit, document, minimal bridge — **no Prisma changes**.

---

## 1. Files inspected

### Studios routes & shell

| Path | Role |
|------|------|
| `app/studios/page.tsx` | Marketing landing |
| `app/studios/start/page.tsx` | Template editor (`StudioEditor`) |
| `app/studios/[slug]/page.tsx` | Public live page (`TrainerStudioShell` live) |
| `app/studios/apply/page.tsx` | Apply flow |
| `app/studios/pvt-net-login/page.tsx` | Placeholder — must not become parallel auth |
| `app/studios/layout.tsx` | Studios chrome |
| `app/(app)/studios/inbox/page.tsx` | Concierge sessions for owned `Studio` rows |
| `app/(app)/admin/studios/*` | Admin overview + preset lab |

### Studios components (32 files under `components/studios/`)

Key: `TrainerStudioShell`, `ApplyStudioHero`, `StudioHeroTriad`, `StudioEditor`, `StudiosLandingClient`, `StudioTopNav`, proof/training legacy sections.

### AIH Spaces

| Path | Role |
|------|------|
| `app/(app)/aihsafe/page.tsx` | Family Safe entry |
| `components/aihsafe/spaces/SpacesTab.tsx` | Space list + create CTAs |
| `components/aihsafe/spaces/*CreateFlow.tsx` | Trusted + family wizards |
| `components/aihsafe/founder/FounderShell.tsx` | Hosts SpacesTab |
| `lib/aihsafe/space-creation-types.ts` | Wizard type labels |

### Context rail

| Path | Role |
|------|------|
| `components/context-rail/*` | Governance rail — **no Studio references** today |

### Data & types

| Path | Role |
|------|------|
| `prisma/schema.prisma` | `Studio`, `StudioServiceTier`, `StudioVoiceProfile`, `DashboardSpace`, Trust/Family units, `AihMsg*` |
| `types/studios.ts` | Marketing `Provider`, offers, **unused** relationship enums |
| `types/aihsafe/*` | Roles, membership, vault, invites |
| `lib/studios/resolveStudioPage.ts` | Mock + DB slug resolution |
| `lib/studios/loadStudioFromDb.ts` | Prisma → Provider projection |

### Docs (prior agents)

`docs/studios/agent-89..91*.md`, `docs/studio-templates.md`, `docs/aihsafe/agent-28-spaces-foundation-report.md`, `docs/aihsafe/agent-86-space-creation-flow-report.md`.

---

## 2. What Studios currently owns

- Public/marketing **presentation** (hero triad, why/how sections, map, footer)
- **Template builder** with browser `localStorage` drafts (`/studios/start`)
- **Provider-shaped** view models (`Provider`, `StudioOffer`) for UI
- Prisma **`Studio`** row (slug, owner, tiers, voice profile) for seeded/live slugs
- **Concierge** chat sessions keyed by studio context (lead capture)
- Admin **preset lab** for template QA
- Placeholder **pvt-net-login** and top-nav “PVT CLIENT NETWORK” (needs Msg Vault routing, not new auth)

---

## 3. Duplication risks

| Risk | Severity | Notes |
|------|----------|-------|
| Studio-specific invites | High if built | Must use `Invite` + space scope only |
| Studio member messaging | High | Msg Vault is canonical |
| `Provider` vs `User` identity | Medium | Provider is display adapter |
| `StudioRelationship` types | Low (dormant) | Types only — no table |
| Concierge vs Vault | Medium | Document: concierge = public funnel |
| `DashboardSpace` naming | Medium | Not the same as Trust Unit “Space” |
| Hero contact as “listing” | Low (fixed Agent 91) | Publish fields belong in steward profile/Space meta |

---

## 4. What should move under Spaces

- Membership, invites, private threads, governance, notices
- “Private client network” entry → Msg Vault / Space home
- Steward permissions and moderator actions

---

## 5. What should remain Studio-specific

- `/studios/[slug]` branded preview
- Template/editor UX and publish preview chrome
- Hero videos, benefits copy, map **presentation**
- Service tier display cards
- Concierge as optional **pre-member** funnel

---

## 6. Proposed architecture

See [studios-as-published-spaces.md](./studios-as-published-spaces.md).

```text
Space (governed)  →  Published Studio (branded public layer)
```

Future FK: `Studio.trustUnitId` or `presentationSpaceId` — **requires dedicated migration PR**.

---

## 7. Creation flow

See [studio-creation-flow.md](./studio-creation-flow.md).

**Wired today:** Spaces tab → “Create Published Studio” → `/studios/start` + powered-by-Spaces note.

**Not wired:** Full “+ Create Space” menu with Published Studio wizard + auto TrustUnit.

---

## 8. Role mapping

| Studio | AIH |
|--------|-----|
| Owner | Space steward / `Studio.ownerId` / founder |
| Admin | Moderator + founder settings |
| Member | TrustUnit / FamilyUnit member |
| Guest | Public preview + invite request only |

Details: [studio-aih-boundary-map.md](./studio-aih-boundary-map.md).

---

## 9. Route mapping (recommendation)

| Purpose | Route | Notes |
|---------|-------|-------|
| Public preview | `/studios/[slug]` | Keep |
| Editor (interim) | `/studios/start` | Keep until space-linked editor |
| Editor (target) | `/spaces/[spaceId]/studio/edit` | New — owns same `StudioEditor` shell |
| Member private | `/aihsafe` + Msg Vault | Space-scoped threads |
| Request access | Public CTA → `/invite/[token]` or modal → `POST /api/invite` | No `/studios/invite` |
| Pvt network | Deprecate `/studios/pvt-net-login` → redirect to Vault | |

---

## 10. Code changes (Agent 92)

| File | Change |
|------|--------|
| `lib/studios/publishedSpaceBridge.ts` | **New** — copy + href constants |
| `components/studios/StudiosSpacesPoweredNote.tsx` | **New** — editor bridge |
| `app/studios/start/page.tsx` | Powered-by-Spaces note |
| `components/aihsafe/spaces/SpacesTab.tsx` | Published Studios section + CTA |
| `lib/aihsafe/space-creation-types.ts` | `SPACE_PLATFORM_CREATION_OPTIONS` (documented) |
| `docs/studios/*.md` | Architecture set (4 docs) |

**No Prisma schema changes.**

---

## 11. What to build next

1. `studio.spaceId` / `trustUnitId` FK + migration design review  
2. Publish pipeline: draft JSON → DB + slug, link to Space on create  
3. Request-access CTA on `/studios/[slug]` → AIH invite with space scope  
4. Replace `pvt-net-login` with Msg Vault deep link for members  
5. Unified Create Space modal including Published Studio wizard  
6. Move editor to `/spaces/[id]/studio/edit`  
7. Data-drive `TrainerStudioShell` sections from template envelope (studio-templates.md)  

---

## 12. What NOT to build

- Separate Studio invite API or tokens  
- Studio message store / duplicate Msg Vault UI  
- Parallel Studio user roles table  
- Full Studios UI redesign (Agent 89–91 hero work stays)  
- New globals.css layout experiments without Tailwind-first approach  
- Prisma changes without explicit migration PR  

---

## 13. Validation results

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Pass** (exit 0) |
| `npx next build` | **Pass** (exit 0, ~27s) |

---

*Agent 92 — architecture + documentation + light Spaces bridge.*
