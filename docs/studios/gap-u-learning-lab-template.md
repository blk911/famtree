# Gap U / Learning Lab Template

**Template id:** `gap-u-learning-lab`  
**Agent 93** — private learning Studio for families, students, tutors, and lab-style programs.

Gap U is a **variant of Family & Learning** with education-specific sections and stricter safety defaults — not a separate product or auth system.

---

## Definition

**Gap U** = a private learning Studio where:

- Families, students, tutors, and instructors collaborate inside a governed AIH Space
- Parents coordinate schedules, resources, and updates
- Students access **student-safe** sub-spaces under guardian/policy rules
- Public preview is usually **off**; discovery is invite-first

Use cases:

| Use case | Description |
|----------|-------------|
| Homeschool support | Parent-led cohorts, resource sharing |
| Catch-up tutoring | Subject-focused small groups |
| Special subjects | Music, STEM, languages |
| Invention / create labs | Project-based, mentor-led |
| Parent coordination | Announcements, calendars, consent-aware messaging |

---

## Audience & tone

| Dimension | Guidance |
|-----------|----------|
| Primary steward | Parent, lead tutor, or program director |
| Members | Parents, adult instructors, students (via guardian-linked accounts) |
| Tone | Supportive, clear, safety-first; avoid hype or aggressive sales |
| Copy style | Learning outcomes, schedule clarity, who teaches what |

---

## Default sections

| Section key | Title (default) | Purpose | Visible default |
|-------------|-----------------|---------|-----------------|
| `learning_focus` | Learning focus | Subjects, age bands, goals | ON |
| `tutors_instructors` | Tutors & instructors | Bios, credentials (user-entered) | ON |
| `labs` | Labs & projects | Maker/invention tracks | ON |
| `schedule_resources` | Schedule & resources | Calendar links, materials | ON |
| `parent_updates` | Parent updates | How announcements work in private Space | ON |
| `student_safe_spaces` | Student-safe spaces | Explains Msg Rules / guardian visibility | ON |
| `hero` | Hero | family-learning triad variant | ON |
| `why_studios` | Why this space | Benefits of private learning network | ON |
| `how_it_works` | How it works | Invite → join → Msg Vault | ON |
| `request_access` | Request access | AIH invite path | ON |
| `local_presence` | Location | Optional; often hidden | OFF |
| `service_pricing` | Pricing tiers | Display-only cards | OFF |

---

## AI draft emphasis (Step 3)

When `templateType === gap-u-learning-lab`, generator should prefer:

- Programs as **learning tracks** not commercial “offers”
- Invite copy mentioning parents/guardians where minors involved
- First post: welcome + “how to use this learning space”
- Warnings if scraped content implies child data — strip and flag

Suggested sections list for AI:

```json
[
  "learning_focus",
  "tutors_instructors",
  "labs",
  "schedule_resources",
  "parent_updates",
  "student_safe_spaces"
]
```

---

## Default invite intent

| Setting | Value |
|---------|--------|
| Primary path | Steward sends AIH email invite |
| Secondary | Request access with steward approval |
| Roles (target) | Parent, instructor, student (guardian-linked) |
| Identity gate | Standard AIH invite challenge — no Studio bypass |

---

## Default Msg Rules / Boundaries

| Rule | Preset |
|------|--------|
| Student messaging | Restricted per policy profile; guardian visibility ON |
| Public → member | No direct messaging from preview page |
| Announcements | Steward/moderator broadcast channel |
| Concierge | OFF by default (no anonymous child-facing chat) |
| Media sharing | Follow Space media policy |

Maps to AIH **policy profiles** and Msg Rules — document presets in Agent 94 enum `gapULearningLabMsgPreset`.

---

## Public preview

| Default | Rationale |
|---------|-----------|
| `publicEnabled: false` | Minor-adjacent communities; invite-first |
| Steward override | Limited public page without student PII |

If enabled: hide precise addresses, student names in proof sections, and scraped reviews.

---

## Space binding (publish)

| Target entity | Notes |
|---------------|-------|
| `FamilyUnit` preferred | Natural fit for family/tutor graph |
| `TrustUnit` + `CLUB` | Alternative for larger learning orgs |
| Dashboard post scope | `CLUB` or education-labeled scope when timeline used |

Link `studio.spaceId` when FK exists (post Agent 99).

---

## Source links relevant to Gap U

Typical inputs: website, YouTube (lessons), Google Business (tutor center), manual program notes.

Avoid treating social feeds as authoritative for student-related claims.

---

## Differentiation from generic `family-learning`

| Aspect | `family-learning` | `gap-u-learning-lab` |
|--------|-------------------|------------------------|
| Sections | General family benefits | Learning focus, labs, tutors, parent updates |
| Preview default | OFF recommended | OFF default |
| Copy | Broad family network | Tutoring/homeschool/lab specific |
| Msg presets | Standard family | Student-safe + guardian emphasis |

---

## Related docs

- [studio-template-gallery.md](./studio-template-gallery.md)
- [studio-builder-flow.md](./studio-builder-flow.md)
- [studio-ai-draft-model.md](./studio-ai-draft-model.md)
