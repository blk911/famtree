# VMB Client Invite Experience

## Product Contract

The public invite page is the client-facing product moment: a private gift envelope that opens into one luxury salon invitation.

Nothing on this page should feel like an admin dashboard, test preview, or internal workflow. The client should see a personal invitation from the salon, understand the gift, and choose whether to claim it.

## Flow

1. Salon sends an approved invite, creating a `SentInvite` snapshot and secure recipient token.
2. Client opens the token URL.
3. The page shows a closed gift-envelope treatment.
4. Client opens the envelope.
5. The invitation reveals the salon image, personal message, gift details, and claim actions.
6. “Claim My Gift” continues to the existing claim route.

## Data Behavior

The page renders only from the public recipient invite state returned by the SentInvite resolver.

It preserves:

- client name
- salon display name
- tech/provider name
- invite title and body
- hero image slots
- service and level-up tags
- expiration/terms label
- claim URL

It does not create an open event, claim, hold, adjustment, or redemption. Envelope opening is UI-only.

## Forbidden Public Copy

Do not use operator/admin language on the public invite page:

- Action Item
- Client CTA Preview
- Preview
- Modal
- Template
- Inventory
- Private Client Page
- Handle it

Use client invitation language instead:

- private invitation
- your gift
- curated for you
- claim your invite
- hold until later

## Visual Direction

Use soft blush, cream, rose, champagne, and wine accents. Keep the invitation elegant and personal:

- single centered experience
- closed envelope first
- one opened invitation card
- rounded cream panels
- serif headline typography
- delicate dividers
- readable mobile stacking

Avoid black/gold luxury styling and generic SaaS card grids.
