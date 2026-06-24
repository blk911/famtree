# VMB MVP Product Map

## Purpose
This map shows the business flow from AIH login through salon-owner send flow to client claim and redemption.

## MVP Spine

```mermaid
flowchart TD
  A[AIH Login\nScreen: AIH entry/login\nAction: user authenticates\nState: identity verified] --> B[Salon Authority\nScreen: salon session bridge\nAction: bind owner to salon\nState: signed salon authority]
  B --> C[Salon Workspace\nScreen: salon owner workspace\nAction: owner reviews growth tools\nState: salon context active]
  C --> D[Active Touchpoint Selection\nScreen: invites/touchpoints area\nAction: select approved active touchpoint\nState: eligible candidate]
  D --> E[Review Send Package\nScreen: SendPackagePreviewModal\nAction: review client, card, offer, expiration\nState: send-ready package]
  E --> F[Send Invite\nScreen: modal send button\nAction: POST /api/vmb/sent-invites\nState: SentInvite created]
  F --> G[Secure Recipient URL\nScreen: send success\nAction: copy/share URL\nState: tokenized invite]
  G --> H[Client Invite Landing\nScreen: /vmb/invite/{token}\nAction: client opens invite\nState: opened event]
  H --> I[Client Claims Offer\nScreen: invite claim form\nAction: submit claim\nState: claim recorded]
  I --> J[Salon Claims Timeline\nScreen: SalonClaimsTimeline\nAction: salon sees claim\nState: claim visible]
  J --> K[Mark Redeemed\nScreen: salon timeline action\nAction: redeem invite\nState: invite closed]
```

## Product Truth
Nothing client-facing exists until a `SentInvite` exists.

Nothing claimable exists without a secure recipient token.

Nothing mutable changes sent offer terms.

Nothing redeemed remains publicly available.

## MVP Readiness
The core transaction rail is MVP-ready:

- Salon authority is signed.
- Send-time eligibility is enforced.
- Sent invite snapshots are immutable.
- Public access is token-only.
- Claims are idempotent for the same contact.
- Different-contact duplicate claims are rejected.
- Salon timeline can show claims and redemption.

## Remaining Non-Blocking Items
- Email/SMS transport is not built yet.
- Legacy Sent tab remains visually present.
- Offer lifecycle currently uses `active` as publish eligibility.
- Old unsigned sessions must log in again.
