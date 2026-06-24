# VMB MVP API Map

## Purpose
This document maps the production-relevant API surface for the send/claim rail.

## API Flow

```mermaid
sequenceDiagram
  participant Owner as Salon Owner Browser
  participant SendAPI as POST /api/vmb/sent-invites
  participant Domain as create-sent-invite.ts
  participant Store as sent-invite-store.ts
  participant Client as Client Browser
  participant PublicPage as /vmb/invite/{token}
  participant ClaimAPI as POST /api/vmb/invite-claims
  participant RedeemAPI as POST /api/vmb/sent-invites/{id}/redeem

  Owner->>SendAPI: send approved active touchpoint
  SendAPI->>Domain: validate authority + eligibility
  Domain->>Store: create immutable SentInvite snapshot
  Store-->>SendAPI: sanitized DTO + recipient URL
  SendAPI-->>Owner: secure URL

  Client->>PublicPage: open token URL
  PublicPage->>Store: resolve by token hash
  Store-->>PublicPage: public-safe invite DTO

  Client->>ClaimAPI: claim offer
  ClaimAPI->>Store: create or resolve claim
  Store-->>ClaimAPI: claim result
  ClaimAPI-->>Client: success / already claimed / conflict

  Owner->>RedeemAPI: mark redeemed
  RedeemAPI->>Store: close invite
  Store-->>RedeemAPI: sanitized redeemed DTO
```

## Response Safety
Salon/browser responses must not include:

- `tokenHash`
- raw token
- raw DB rows
- internal salon IDs in public payloads
- source approval IDs
- source copy IDs
- internal catalog/admin metadata
- mutable raw snapshot internals

## Endpoint Ownership
- Send: salon-authorized only.
- Timeline/list: salon-authorized only.
- Redeem: salon-authorized only.
- Public invite page: token-only.
- Claim: token-bound, contact-aware.
