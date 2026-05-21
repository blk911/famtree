# Studio Template Gallery

**Agent 93** — six builder templates aligned with community OS positioning (Agents 89–91) and Space types in `lib/aihsafe/space-creation-types.ts`.

Templates are **presentation + policy presets**. Governed membership always uses AIH Trust/Family units and `Invite` — never a Studio-specific member table.

---

## Gallery overview

| Template id | Display name | Target audience | Underlying Space (target) |
|-------------|--------------|-----------------|---------------------------|
| `private-studio-network` | Private Studio Network | Creators, coaches, faith/ministry circles, tight member groups | TrustUnit — member network tone |
| `private-client-network` | Private Client Network | Service providers, salons, trainers, client cohorts | TrustUnit — `BUSINESS` vault flavor |
| `family-learning` | Family & Learning Space | Families, co-ops, parent groups, tutors | FamilyUnit or TrustUnit `CLUB` |
| `executive-work` | Executive Strategy Space | Leadership teams, boards, exec peers | TrustUnit — `PRIVATE` / executive room |
| `local-community` | Local Community / Church / PTA | Neighborhood, church, PTA, volunteer orgs | TrustUnit — community / `CHURCH` post scope |
| `gap-u-learning-lab` | Gap U / Learning Lab | Homeschool, tutoring, labs, parent coordination | FamilyUnit + learning presets — [gap-u-learning-lab-template.md](./gap-u-learning-lab-template.md) |

---

## Per-template specification

### 1. Private Studio Network (`private-studio-network`)

| Attribute | Value |
|-----------|--------|
| **Target audience** | Member-only communities; creators who want private updates without public social chaos |
| **Default copy style** | Warm, direct, “your people / your updates”; triad card `studio-network` |
| **Sections shown** | Hero triad (member lens emphasized), Why Studios, How it works, Local presence (map), Request access, optional proof/testimonials |
| **Sections hidden by default** | Heavy service-tier pricing grid |
| **Default invite intent** | Member invite — steward approves; identity gate on email invite |
| **Default Msg Rules** | Members-only threads; prospects via request-access only; no DMs from public |
| **Public preview default** | ON (steward can turn OFF in Step 4) |
| **Hero video default** | `Private_Studio_Network_Intro 1.mp4` |

### 2. Private Client Network (`private-client-network`)

| Attribute | Value |
|-----------|--------|
| **Target audience** | Professionals with recurring clients; booking-adjacent businesses |
| **Default copy style** | Professional, outcomes-focused; triad card `client-network` |
| **Sections shown** | Hero, service/program cards, How it works, request access, optional booking CTA (link only) |
| **Sections hidden by default** | Family/education blocks |
| **Default invite intent** | Client invite — email match + steward approval |
| **Default Msg Rules** | Client role messaging within Space; concierge for anonymous public leads only |
| **Public preview default** | ON |
| **Hero video default** | `Private_Studio_Network_buasiness 1.mp4` |

### 3. Family & Learning Space (`family-learning`)

| Attribute | Value |
|-----------|--------|
| **Target audience** | Families, learning pods, parent coordinators |
| **Default copy style** | Supportive, safety-first; triad card `family-learning` |
| **Sections shown** | Hero, benefits, schedule/resources placeholder, parent-safe messaging note, request access |
| **Sections hidden by default** | Aggressive commercial offers |
| **Default invite intent** | Family/guardian-linked invite; youth policies via AIH guardian rules |
| **Default Msg Rules** | Guardian visibility presets; student-safe spaces flagged in copy |
| **Public preview default** | OFF (recommended) — steward may enable limited public preview |
| **Hero video default** | `Private_Studio_Network_Education 1.mp4` |

### 4. Executive Strategy Space (`executive-work`)

| Attribute | Value |
|-----------|--------|
| **Target audience** | Executives, boards, confidential work groups |
| **Default copy style** | Concise, confidential, strategy-oriented |
| **Sections shown** | Minimal hero, how it works (access-controlled), request access — no public directory |
| **Sections hidden by default** | Map with precise address, public testimonials, social proof scrapes |
| **Default invite intent** | Invite-only; no open request without steward toggle |
| **Default Msg Rules** | Strict visibility; audit-friendly; no public concierge by default |
| **Public preview default** | OFF |
| **Hero video default** | Neutral / optional upload only |

### 5. Local Community / Church / PTA (`local-community`)

| Attribute | Value |
|-----------|--------|
| **Target audience** | Churches, PTAs, clubs, local volunteer networks |
| **Default copy style** | Inclusive, event-oriented, community calendar tone |
| **Sections shown** | Hero, Why Studios, programs/events cards, local presence, request access |
| **Sections hidden by default** | Client billing tiers |
| **Default invite intent** | Community member request + steward approval |
| **Default Msg Rules** | Moderator role for announcements; member channels |
| **Public preview default** | ON |
| **Hero video default** | Community-appropriate stock or upload |

### 6. Gap U / Learning Lab (`gap-u-learning-lab`)

See dedicated doc. Summary:

| Attribute | Value |
|-----------|--------|
| **Target audience** | Families, students, tutors, instructors, invention labs |
| **Default copy style** | Learning-first, parent coordination, student safety |
| **Sections shown** | Learning focus, tutors/instructors, labs, schedule/resources, parent updates |
| **Default invite intent** | Parent/guardian + instructor roles |
| **Default Msg Rules** | Student-safe spaces; guardian visibility |
| **Public preview default** | OFF |

---

## Template → code mapping (today vs target)

| Concern | Today | Target |
|---------|-------|--------|
| Neutral envelope | `lib/studio/templates/neutral-studio-template.ts` | All templates extend neutral spine |
| Hero triad copy | `lib/studios/communityOsHeroCopy.ts` | Steps 1 & 3 seed from gallery id |
| Space creation labels | `SPACE_PLATFORM_CREATION_OPTIONS` | Step 5 picks matching TrustUnit/FamilyUnit kind |
| DB | `Studio` + tiers | `templateType` enum on builder session / Studio meta JSON |

---

## Changing templates in review

When steward changes template in Step 4:

1. Show diff of sections that will reset vs merge
2. Preserve user-approved fields where keys match
3. Re-apply default Msg Rule **presets** only if user confirms
4. Never auto-publish on template switch

---

## Related docs

- [studio-builder-flow.md](./studio-builder-flow.md)
- [gap-u-learning-lab-template.md](./gap-u-learning-lab-template.md)
- [studio-ai-draft-model.md](./studio-ai-draft-model.md)
- `docs/studio-templates.md` — neutral spine + fitness vertical (legacy render)
