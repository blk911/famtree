# Studio Source Intake Model

**Agent 93** — normalized intake for public link sources. No credentials, no private scraping.

---

## `StudioSourceInput` (conceptual contract)

Agent 94 should add to `types/studios/builder.ts` (or equivalent).

```typescript
type StudioSourceType =
  | "instagram"
  | "website"
  | "booking"
  | "glossgenius"
  | "vagaro"
  | "square"
  | "youtube"
  | "facebook"
  | "google_business"
  | "linkedin"
  | "manual";

type StudioSourceStatus =
  | "pending"      // URL saved, not extracted
  | "extracting"   // in flight (stub job)
  | "extracted"    // structured data available
  | "failed"       // user can retry or edit manually
  | "skipped";     // user chose manual-only

interface StudioSourceInput {
  id: string;                    // uuid per row
  sessionId: string;             // StudioBuilderSession FK
  sourceType: StudioSourceType;
  url: string;                   // normalized https URL
  label?: string;                // user-facing nickname
  userNotes?: string;
  status: StudioSourceStatus;
  extractedAt?: string;          // ISO timestamp
  extractionConfidence?: number; // 0–1 aggregate for this source
  extractedData?: StudioSourceExtractedData;
  createdAt: string;
  updatedAt: string;
}
```

---

## `StudioSourceExtractedData` (per-source payload)

Flexible JSON blob — AI stub fills best-effort from **public** signals only.

```typescript
interface StudioSourceExtractedData {
  displayName?: string;
  tagline?: string;
  category?: string;
  toneHints?: string[];
  audienceHints?: string[];
  location?: {
    city?: string;
    region?: string;
    country?: string;
    formatted?: string;
    confidence?: number;
  };
  services?: Array<{ name: string; description?: string; priceHint?: string }>;
  offers?: string[];
  mediaUrls?: string[];          // references only — not hotlinked assets in DB long-term
  socialProof?: string[];        // quotes, review snippets — require human confirm
  contactHints?: {
    email?: string;
    phone?: string;
    website?: string;
    confidence?: number;
  };
  platformMeta?: Record<string, string>; // e.g. channelId, handle — display only
  rawSnippets?: string[];        // dev/stub only; strip before publish
}
```

---

## Supported source types

| `sourceType` | Typical URL patterns | Extraction MVP |
|--------------|---------------------|----------------|
| `instagram` | `instagram.com/...` | Stub: handle + public bio text if user pastes; no login |
| `website` | Any HTTPS site | Stub: title/meta description via optional server fetch of public HTML (rate-limited, robots-aware) — **not** full crawl |
| `booking` | Generic booking links | Stub: label + hostname |
| `glossgenius` | `glossgenius.com/...` | Stub: business name from path |
| `vagaro` | `vagaro.com/...` | Stub: business name from path |
| `square` | `square.site/...` | Stub: site title |
| `youtube` | `youtube.com/@...` | Stub: channel title from oEmbed/public page if allowed |
| `facebook` | `facebook.com/...` | Stub: page name hint only — no auth |
| `google_business` | Maps/share URLs | Stub: place name from user paste; no Places API (paid) in MVP |
| `linkedin` | `linkedin.com/company/...` | Stub: company slug → display name |
| `manual` | N/A | User-entered facts only; `url` optional |

---

## Validation rules

| Rule | Enforcement |
|------|-------------|
| HTTPS only | Reject `javascript:`, `file:`, internal IPs |
| One row per URL per session | Dedupe on normalized URL |
| Max sources per session | 12 (configurable) |
| Public URLs only | UI copy + server validation |
| No credentials | No `password`, `token`, or cookie fields in schema |
| Extraction failure | `status: failed` — wizard continues to manual draft |

---

## Aggregation into AI draft

`buildDraftFromSources(sources: StudioSourceInput[], profile?: UserProfileSlice)`:

1. Merge `extractedData` with confidence weighting
2. Prefer higher-confidence location/contact from `google_business` + `website` + user profile hydration
3. De-duplicate services/offers by fuzzy name match
4. Emit `confidenceWarnings` for conflicting fields (e.g. two cities)
5. Never copy `rawSnippets` into publish JSON

---

## Persistence (Agent 94+)

| Store | Purpose |
|-------|---------|
| `StudioBuilderSession.sources` | JSON array embedded or child table |
| Server | Optional `StudioSourceInput` rows for audit/retry |

Until schema exists: session JSON in DB + ephemeral client state during wizard.

---

## Privacy

- Do not fetch URLs that require authentication
- Do not store platform passwords or session cookies
- Log extraction jobs without PII in production logs
- User confirms all generated claims before publish — see [studio-builder-flow.md](./studio-builder-flow.md) Step 4

---

## Related docs

- [studio-ai-draft-model.md](./studio-ai-draft-model.md)
- [studio-builder-flow.md](./studio-builder-flow.md)
