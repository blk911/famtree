# Agent 93 — Studio Builder Intake Architecture Report

**Branch:** `studios-agent-93-builder-intake-architecture`  
**Mission:** Architecture / planning only — define builder intake (template → sources → AI draft → review → publish).  
**No implementation:** No scraping, paid APIs, browser automation, Prisma changes, or parallel AIH identity.

---

## 1. Files inspected

### Required reading (prior agents)

| Doc | Notes |
|-----|-------|
| `docs/studios/studios-as-published-spaces.md` | Published layer on Spaces |
| `docs/studios/studio-creation-flow.md` | Entry points + target wizard |
| `docs/studios/studio-aih-boundary-map.md` | Duplication risks, API boundaries |
| `docs/studios/agent-92-published-spaces-architecture-report.md` | File inventory, bridge code |
| `docs/studios/agent-90-community-os-positioning-report.md` | Hero triad OS framing |
| `docs/studios/agent-91-hero-card-positioning-report.md` | Three hero cards + videos |

### Studios routes & builder (code)

| Path | Role |
|------|------|
| `app/studios/start/page.tsx` | Live editor entry — becomes wizard host |
| `app/studios/[slug]/page.tsx` | Published preview — **unchanged** |
| `components/studios/StudioEditor.tsx` | Editor wrapper |
| `components/studios/trainer/TrainerStudioShell.tsx` | `variant="start"` shell |
| `components/studios/trainer/ApplyStudioHero.tsx` | Hero/contact draft + publish gating |
| `components/studios/StudioHeroTriad.tsx` | Triad presentation |
| `lib/studios/communityOsHeroCopy.ts` | Triad copy + video refs |
| `lib/studios/studioIntroVideo.ts` | Intro MP4 paths |
| `lib/studio/templates/neutral-studio-template.ts` | Neutral spine |
| `lib/studio/templates/normalizeStudioTemplate.ts` | Draft key `amih_studios_neutral_base_draft_v2` |
| `lib/studios/publishedSpaceBridge.ts` | Spaces ↔ Studios copy |
| `components/studios/StudiosSpacesPoweredNote.tsx` | Bridge note on start |
| `lib/studios/getCurrentUserStudioHref.ts` | Owned slug only → else `/studios/start` |

### AIH Spaces & types

| Path | Role |
|------|------|
| `components/aihsafe/spaces/SpacesTab.tsx` | Create Published Studio CTA |
| `lib/aihsafe/space-creation-types.ts` | `SPACE_PLATFORM_CREATION_OPTIONS` |
| `types/studios.ts` | `Provider`, offers — view models |
| `types/aihsafe/*` | Vault, membership, invites |
| `prisma/schema.prisma` | `Studio`, TrustUnit, FamilyUnit, `AihMsg*` — no builder tables yet |

### Context rail

| Path | Role |
|------|------|
| `components/context-rail/*` | Governance rail — no Studio builder refs |

### New docs (Agent 93)

- [studio-builder-flow.md](./studio-builder-flow.md)
- [studio-template-gallery.md](./studio-template-gallery.md)
- [studio-source-intake-model.md](./studio-source-intake-model.md)
- [studio-ai-draft-model.md](./studio-ai-draft-model.md)
- [gap-u-learning-lab-template.md](./gap-u-learning-lab-template.md)

---

## 2. Builder flow

Canonical five-step wizard documented in [studio-builder-flow.md](./studio-builder-flow.md):

1. **Choose Studio Type** — six templates aligned with hero triad + Space kinds  
2. **Add Source Links** — public URLs → `StudioSourceInput`  
3. **AI Draft** — extract + generate → `StudioDraft` (stub in MVP)  
4. **Review / Edit** — approve, regenerate section, confirm contact/location/claims  
5. **Publish** — Published Studio + AIH Space + Msg Vault stub + AIH invite path  

**Preserves today:** `/studios/start` editor, preview/publish UX in `ApplyStudioHero`, `/studios/[slug]` live shell. Wizard is additive; publish still requires steward approval.

**State machine:** `INTAKE_TYPE_SELECTED` → … → `PUBLISHED` (session-backed in Agent 94+).

---

## 3. Template gallery

Six templates in [studio-template-gallery.md](./studio-template-gallery.md):

| Template | Public preview default | Space target |
|----------|------------------------|--------------|
| Private Studio Network | ON | TrustUnit — member network |
| Private Client Network | ON | TrustUnit — business/client |
| Family & Learning Space | OFF recommended | FamilyUnit / CLUB |
| Executive Strategy Space | OFF | TrustUnit — private |
| Local Community / Church / PTA | ON | TrustUnit — community |
| Gap U / Learning Lab | OFF | FamilyUnit + learning presets |

Each defines: audience, copy style, sections, invite intent, Msg Rule presets.

---

## 4. Source intake model

[studio-source-intake-model.md](./studio-source-intake-model.md) defines:

- **`StudioSourceInput`:** `sourceType`, `url`, `label`, `userNotes`, `status`, `extractedAt`, `extractionConfidence`, `extractedData`
- **Types:** instagram, website, booking, glossgenius, vagaro, square, youtube, facebook, google_business, linkedin, manual
- **MVP extraction:** hostname/path stub + optional rate-limited public HTML peek — not full scrape
- **Aggregation:** merge into draft with confidence warnings

---

## 5. AI draft model

[studio-ai-draft-model.md](./studio-ai-draft-model.md) defines **`StudioDraft`**:

- `identity`, `templateType`, `hero`, `cards`, `benefits`, `howItWorks`, `servicesPrograms`, `location`, `media`, `inviteCopy`, `firstPosts`, `requestAccessCopy`, `confidenceWarnings`, `approvals`
- Maps to existing hero/section modules and `NormalizedStudioTemplate` at publish
- Agent 97: deterministic stub acceptable; LLM optional later

---

## 6. Gap U template

[gap-u-learning-lab-template.md](./gap-u-learning-lab-template.md):

- Private learning Studio for homeschool, tutoring, labs, parent coordination
- Default sections: learning focus, tutors/instructors, labs, schedule/resources, parent updates, student-safe spaces
- `publicEnabled` default OFF; guardian-forward Msg presets; FamilyUnit preferred at publish

---

## 7. AIH integration

| Concern | Owner |
|---------|--------|
| Identity / login | AIH `User` + sessions — no Studio auth |
| Studio steward | `Studio.ownerId` + Space creator role |
| Governed Space | TrustUnit or FamilyUnit created at publish (Agent 99) |
| Member access | `POST /api/invite` + identity gate; space-scoped ids when FK ready |
| Messaging | Msg Vault — welcome thread stub only; not Studio inbox |
| Rules | Msg Rules / policy profiles — template presets, not duplicate tables |
| Public CTA | Request access → AIH invite pipeline |
| Future FK | `studio.spaceId` → TrustUnit/FamilyUnit (design before Prisma) |

Concierge remains **pre-membership lead capture** on public pages — separate from member Msg Vault.

---

## 8. Privacy / safety rules

| Rule | Implementation stance |
|------|------------------------|
| Public URLs only | Validate HTTPS; reject auth flows |
| No private scraping | No logged-in platform fetch |
| No credentials stored | Schema has no secret fields |
| No browser automation | No Playwright/Puppeteer in pipeline |
| User confirms claims | `claimsConfirmed` + section approvals |
| Contact/location confirm | Publish gates in `StudioDraftApprovals` |
| Child-adjacent (Gap U) | Strip scraped child PII; preview OFF default |
| Publishing | Does not bypass invite/membership/guardian rules |

---

## 9. MVP build sequence (recommended agents)

| Agent | Scope |
|-------|--------|
| **94** | `StudioBuilderSession`, `StudioSourceInput`, `StudioDraft` — Prisma + `types/studios/builder.ts` |
| **95** | Wizard shell on `/studios/start` (stepper, routing, save session) |
| **96** | Source link intake UI + persistence |
| **97** | AI draft generator stub/mock (merge sources + gallery templates) |
| **98** | Review/edit screen — approvals, regenerate section, confirm gates |
| **99** | Publish → create Space + `Studio` + link Msg Vault + invite defaults |
| **100** | QA/security — URL validation, no credential leaks, invite-only publish tests |

**Explicitly out of scope until product approval:** paid Places/social APIs, headless scraping, parallel invite tables.

---

## 10. Validation result

| Check | Result |
|-------|--------|
| Mission scope | Planning/docs only — **met** |
| No scraping / paid APIs / automation | Documented as prohibited — **met** |
| Existing preview/publish flow | Preserved by design — **met** |
| No parallel AIH identity | Documented — **met** |
| Source code touched | **No** — docs only |
| `npm run typecheck` / `npx next build` | **Skipped** (per validation: docs-only) |

---

## Deliverables summary

| File | Purpose |
|------|---------|
| `studio-builder-flow.md` | Five-step wizard + state machine |
| `studio-template-gallery.md` | Six templates with defaults |
| `studio-source-intake-model.md` | `StudioSourceInput` contract |
| `studio-ai-draft-model.md` | `StudioDraft` contract + review rules |
| `gap-u-learning-lab-template.md` | Gap U sections + safety |
| `agent-93-builder-intake-architecture-report.md` | This report |

---

## Next step

Commit docs on `studios-agent-93-builder-intake-architecture` and hand off to **Agent 94** for schema/contracts.
