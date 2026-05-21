# Studio / Space Creation Flow (Target)

**Agent 92** — documents intended UX; only a **light bridge** is wired in code today.

---

## Entry points

| Surface | Path | Status |
|---------|------|--------|
| Family Safe → Spaces tab | `/aihsafe` (Spaces tab) | **Bridge:** “Create Published Studio” → `/studios/start` |
| Studio editor (temporary) | `/studios/start` | **Live** — template builder, local draft |
| Target editor | `/spaces/[spaceId]/studio/edit` | **Not built** |
| Admin preset lab | `/admin/studios/template` | **Live** — founder template QA |

---

## Unified “Create Space” menu (target)

Inside **Family Safe → Spaces** (founder):

```text
+ Create Space
  ├── Private Space      → TrustedSpaceCreateFlow (wired)
  ├── Family Group       → FamilyGroupCreateFlow (wired)
  ├── Client Network     → TrustUnit, vault type BUSINESS (label map exists)
  ├── Learning Space     → TrustUnit, vault type CLUB
  ├── Executive Room     → TrustUnit, vault type PRIVATE
  └── Published Studio   → see below
```

Reference constants: `lib/aihsafe/space-creation-types.ts` → `SPACE_PLATFORM_CREATION_OPTIONS`.

---

## Published Studio creation (target wizard)

**Not implemented end-to-end.** Intended steps:

1. **Choose template** — neutral / client network / family-learning (maps to hero triad lenses)
2. **Name & description** — community identity (no directory contact on public hero)
3. **Public preview** — ON/OFF (`publicEnabled`)
4. **Hero media** — triad videos (see `Private_Studio_Network_*.mp4` in `public/uploads/`)
5. **Invite / request access** — policy: who can request, steward approval via **AIH Invite** only
6. **Create governed Space underneath** — TrustUnit or FamilyUnit + link `studio.spaceId` (future FK)
7. **Publish** — writes preview slug; members join via AIH, land in Msg Vault

Until step 6 exists, `/studios/start` is an **editor prototype** with `localStorage` drafts — not a persisted Space+Studio pair.

---

## What happens today when user clicks “Create Published Studio”

1. Navigates to `/studios/start`
2. Sees `StudiosSpacesPoweredNote` (Spaces-powered copy)
3. Uses `StudioEditor` → `TrainerStudioShell` `variant="start"`
4. Hero/contact draft in browser; optional profile hydration from User+Profile
5. No automatic TrustUnit creation
6. No slug publish to DB unless separate seed/admin path

---

## Role at creation time

Creator is **Space steward** (founder or adult with create permission). They become:

- `Studio.ownerId` (when persisted)
- Trust Unit creator (when schema adds `TrustUnitRole.CREATOR`)
- Default moderator for invite approvals in that Space scope

---

## Post-create surfaces

| Audience | Surface |
|----------|---------|
| Public | `/studios/[slug]` when published |
| Member | Msg Vault threads scoped to Space; Family Safe activity |
| Steward | Space settings, invite management, studio edit (future unified) |

---

## Related docs

- [studio-builder-flow.md](./studio-builder-flow.md) — Agent 93 five-step builder (target)
- [agent-93-builder-intake-architecture-report.md](./agent-93-builder-intake-architecture-report.md)
