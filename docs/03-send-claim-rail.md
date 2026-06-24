# VMB Send → Claim → Redemption Rail

## Purpose
This is the canonical MVP money rail.

## Technical Flow

```mermaid
flowchart TD
  A[UI: SendPackagePreviewModal] --> B[API: POST /api/vmb/sent-invites]
  B --> C[Domain: create-sent-invite.ts]
  C --> D[Authority: salon-authority.ts]
  C --> E[Eligibility Checks\napproved invitation\nactive touchpoint\nactive offer\nactive service\nsalon ownership\nfuture expiration]
  E --> F[Store: sent-invite-store.ts\nCreate SentInvite + token hash]
  F --> G[DTO: sent-invite-dto.ts\nSanitized response]
  G --> H[Public URL: /vmb/invite/{token}]
  H --> I[Public Page: app/vmb/invite/[inviteId]/page.tsx]
  I --> J[Domain: resolve-recipient-invite.ts]
  J --> K[Store: markSentInviteOpened]
  K --> L[API: POST /api/vmb/invite-claims]
  L --> M[Domain: submit-invite-claim.ts]
  M --> N[Store: claimSentInvite]
  N --> O[UI: SalonClaimsTimeline]
  O --> P[API: POST /api/vmb/sent-invites/[sentInviteId]/redeem]
  P --> Q[Store: redeemSentInvite]
  Q --> R[State: redeemed / closed]
```

## Canonical States

```text
draft → approved → sent → opened → claimed → redeemed
                     ↘ expired
                     ↘ cancelled
```

## Required Gates

```mermaid
flowchart TD
  A[Send Requested] --> B{Signed salon authority?}
  B -- no --> X[Reject]
  B -- yes --> C{Salon owns touchpoint, offer, service?}
  C -- no --> X
  C -- yes --> D{Touchpoint approved + active?}
  D -- no --> X
  D -- yes --> E{Offer active?}
  E -- no --> X
  E -- yes --> F{Service active?}
  F -- no --> X
  F -- yes --> G{Concrete future expiration?}
  G -- no --> X
  G -- yes --> H[Create immutable SentInvite snapshot]
  H --> I[Generate recipient token]
  I --> J[Store only SHA-256 token hash]
  J --> K[Return sanitized recipient URL]
```

## Claim Rules

```mermaid
flowchart TD
  A[Client submits claim] --> B{Token valid?}
  B -- no --> X[404 / unavailable]
  B -- yes --> C{Invite expired/cancelled/redeemed?}
  C -- yes --> Y[410 / unavailable]
  C -- no --> D{Existing claim?}
  D -- no --> E[Create claim]
  D -- same contact --> F[Return idempotent alreadyClaimed]
  D -- different contact --> G[409 already_claimed_by_other]
  E --> H[Show salon claim timeline]
```

## Money Rail Contract
Nothing client-facing exists until `SentInvite` exists.

Nothing claimable exists without a token.

Nothing mutable changes sent offer terms.

Nothing redeemed remains publicly available.
