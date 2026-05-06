# AIH Studios — template strategy

## Direction

1. **Neutral spine first** — one layout shell (nav regions, hero/contact/marketing blocks, publish flow) shared by every vertical.
2. **Vertical templates second** — presets that swap copy, categories, default tiers, and (later) section-specific blocks (e.g. trainer vs nail vs salon).
3. **Profile hydration** — when a member opens STUDIO from AIH, merge **User + Profile** fields into the template defaults (name, email, phone, location, photo note); videos/media stay placeholders until the member uploads or links assets.

## What is frozen today: **Fitness / performance starter**

The current `/studios/start` experience is saved as the **Fitness template** in code:

| Piece | Location |
| ----- | -------- |
| Template envelope (demo defaults, tiers, nav, intro bullets) | `lib/studio/templates/fitness-studio-template.ts` |
| Clone helper | `cloneFitnessStudioTemplate()` in `lib/studio/templates/cloneStudioTemplate.ts` |
| Normalization → `StudioEditor` props | `lib/studio/templates/normalizeStudioTemplate.ts` |
| Builder shell | `components/studios/StudioEditor.tsx` → `TrainerStudioShell` `variant="start"` |

**Lineage:** The JSON shape originated from the Deb Dazzle seed persona (`scripts/seedDeb.ts`). Demo literals (business name, email, nail-oriented description, tier titles, etc.) remain until we ship **neutral defaults + profile merge**. `sourceStudioSlug` in the template documents that lineage only — no runtime fetch.

**Category:** The fitness starter uses `performance-coach` so `Provider.category` and accents match the “Performance & Longevity” spine (`TrainerStudioShell`).

### Sections not yet in the template envelope

These are still **hardcoded** in `components/studios/trainer/TrainerStudioShell.tsx` for `variant === "start"`:

- **Performance & Longevity** — heading, subcopy, and `StudioTrainingCards`
- **Private Client Feedback** — heading + `StudioTestimonialScroller`
- Lower **Location** / **Contact** headings for the start variant

Next implementation step for Admin + neutral spine: extend the template type + normalization so those strings (and eventually cards) are **data-driven** from the same envelope Admin edits.

## Deprecated naming

`lib/studio/templates/deb-dazzle-template.ts` re-exports the fitness template under legacy names (`DEB_DAZZLE_STUDIO_TEMPLATE`) for grep compatibility. **Prefer** `FITNESS_STUDIO_TEMPLATE` and `fitness-studio-template.ts` for new work.

## Admin

`app/(app)/admin/studios/template/page.tsx` points editors at the repo path for the canonical template (fitness starter until neutral spine ships).
