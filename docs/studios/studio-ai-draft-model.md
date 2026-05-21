# Studio AI Draft Model

**Agent 93** — conceptual `StudioDraft` produced in Step 3, edited in Step 4, consumed in Step 5 publish.

**Never auto-published.** Steward approval required per section and globally before publish.

---

## `StudioDraft` (root)

```typescript
interface StudioDraft {
  id: string;
  sessionId: string;
  version: number;                    // increment on regenerate
  templateType: StudioTemplateType;   // gallery id
  suggestedTemplateType?: StudioTemplateType;
  status: "generating" | "ready" | "in_review" | "approved" | "published";
  identity: StudioDraftIdentity;
  hero: StudioDraftHero;
  cards: StudioDraftPositioningCards;
  benefits: StudioDraftSection;
  howItWorks: StudioDraftSection;
  servicesPrograms: StudioDraftServiceCard[];
  location: StudioDraftLocation;
  media: StudioDraftMedia;
  inviteCopy: StudioDraftInviteCopy;
  firstPosts: StudioDraftPostStub[];
  requestAccessCopy: StudioDraftRequestAccess;
  confidenceWarnings: StudioDraftWarning[];
  approvals: StudioDraftApprovals;
  createdAt: string;
  updatedAt: string;
}
```

---

## Identity

```typescript
interface StudioDraftIdentity {
  name: string;
  slugSuggestion?: string;
  category?: string;
  tone?: string;           // e.g. "warm", "professional"
  audience?: string;       // free-text steward-facing
  tagline?: string;
  fieldConfidence?: Record<string, number>;
}
```

Sources: merged `StudioSourceInput`, optional `hydrateNormalizedStudioFromProfile` (existing start flow).

---

## Hero

```typescript
interface StudioDraftHero {
  eyebrow?: string;
  headline: string;
  subcopy: string[];
  triadLensId?: "studio-network" | "client-network" | "family-learning";
  introVideoScript?: string;
  introVideoSrc?: string;   // from template default or upload ref
  fieldConfidence?: Record<string, number>;
}
```

Aligns with `ApplyStudioHero` / `HERO_OS_TRIAD_CARDS` fields.

---

## Positioning cards (3-card)

```typescript
interface StudioDraftPositioningCards {
  cards: Array<{
    id: string;
    title: string;
    subcopy: string[];
    benefits: string[];
  }>;
}
```

AI may adapt copy from template gallery defaults — not replace triad structure.

---

## Sections (`benefits`, `howItWorks`)

```typescript
interface StudioDraftSection {
  title: string;
  body: string;              // markdown or plain
  bullets?: string[];
  visible: boolean;
  approved: boolean;
  lastGeneratedAt?: string;
}
```

Maps to “Why Studios” and “How Studios works” modules on start shell.

---

## Services / programs

```typescript
interface StudioDraftServiceCard {
  id: string;
  name: string;
  description?: string;
  priceDisplay?: string;     // display only — no payment rails
  visible: boolean;
  approved: boolean;
  sourceRef?: string;        // StudioSourceInput.id
}
```

---

## Location

```typescript
interface StudioDraftLocation {
  displayAddress?: string;
  city?: string;
  region?: string;
  mapVisible: boolean;
  confirmed: boolean;        // must be true for publish
  fieldConfidence?: number;
}
```

**Publish gate:** `confirmed === true` if any location shown on public preview.

---

## Media

```typescript
interface StudioDraftMedia {
  logoUrl?: string;
  heroImageUrl?: string;
  galleryRefs?: string[];    // URLs or upload ids
  videoRefs?: string[];
}
```

Uploads use `lib/storage` conventions — Step 4.

---

## Invite & access copy

```typescript
interface StudioDraftInviteCopy {
  inviteMessage: string;
  emailSubjectSuggestion?: string;
}

interface StudioDraftRequestAccess {
  headline: string;
  body: string;
  ctaLabel: string;
}
```

Must route to **AIH Invite** APIs at publish — no Studio-specific tokens.

---

## First posts

```typescript
interface StudioDraftPostStub {
  id: string;
  title?: string;
  body: string;
  audience: "members" | "stewards";
  approved: boolean;
}
```

Optional seed content for timeline after Space exists — not auto-posted without approval.

---

## Confidence warnings

```typescript
interface StudioDraftWarning {
  field: string;             // dot path e.g. "location.city"
  severity: "low" | "medium" | "high";
  message: string;
  sourceIds?: string[];
}
```

UI: flag in Step 4; block publish on `high` until resolved or manually overridden with confirm.

---

## Approvals

```typescript
interface StudioDraftApprovals {
  sections: Record<string, boolean>;
  globalApproved: boolean;   // steward clicked "Approve draft"
  contactConfirmed: boolean;
  locationConfirmed: boolean;
  claimsConfirmed: boolean;  // no scraped claims without review
}
```

---

## AI generator behavior (Agent 97 stub)

| Phase | MVP implementation |
|-------|-------------------|
| Extract | Merge `extractedData` from sources + profile |
| Generate | Template-filled copy from gallery + light string templates |
| Regenerate section | PATCH one module; bump `version` |
| Model | Optional LLM behind feature flag — **not required for MVP** |

Stub returns deterministic sample from `templateType` + hostname parsing — sufficient for UI wiring.

---

## Mapping to publish payload

Step 5 transforms `StudioDraft` →:

1. `NormalizedStudioTemplate` JSON (existing normalize path)
2. `Studio` Prisma row (slug, ownerId, publicEnabled)
3. Space creation payload (TrustUnit/FamilyUnit)
4. Msg Vault welcome thread stub (metadata only)

Does not bypass existing `TrainerStudioShell` preview/publish controls — wizard feeds the same draft keys where possible.

---

## Human review rules (summary)

| Rule | Enforcement |
|------|-------------|
| No auto-publish | `status` cannot jump to `published` without Step 5 action |
| Low confidence | Warnings + yellow UI |
| Contact/location | `contactConfirmed` + `locationConfirmed` |
| Scraped claims | `claimsConfirmed` |
| Section regenerate | Does not auto-approve that section |

---

## Related docs

- [studio-source-intake-model.md](./studio-source-intake-model.md)
- [studio-builder-flow.md](./studio-builder-flow.md)
- [studio-template-gallery.md](./studio-template-gallery.md)
