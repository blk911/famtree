# VMB MVP Data Map

## Purpose
This map identifies the core data objects used by the MVP send/claim rail.

## Core Objects

```mermaid
erDiagram
  SALON ||--o{ TOUCHPOINT : owns
  SALON ||--o{ SALON_OFFER : owns
  SALON ||--o{ SERVICE : owns
  TOUCHPOINT ||--o{ SENT_INVITE : produces
  SALON_OFFER ||--o{ SENT_INVITE : snapshotted_into
  SERVICE ||--o{ SENT_INVITE : snapshotted_into
  SENT_INVITE ||--o| INVITE_CLAIM : has
  SENT_INVITE ||--o{ INVITE_EVENT : records

  SALON {
    string id
    string displayName
  }

  TOUCHPOINT {
    string id
    string salonId
    string status
    boolean active
  }

  SALON_OFFER {
    string id
    string salonId
    boolean active
  }

  SERVICE {
    string id
    string salonId
    boolean active
  }

  SENT_INVITE {
    string id
    string salonId
    string tokenHash
    string status
    datetime expiresAt
    json snapshot
  }

  INVITE_CLAIM {
    string id
    string sentInviteId
    string contactHash
    datetime claimedAt
  }

  INVITE_EVENT {
    string id
    string sentInviteId
    string eventType
    datetime createdAt
  }
```

## Persistence Rule
Production money-state mutations require Postgres.

JSON/in-memory fallback may exist for non-production tests, but not for Vercel production money state.
