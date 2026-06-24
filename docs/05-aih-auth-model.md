# AIH / VMB Authority Model

## Purpose
This document explains the current identity-to-salon authority bridge.

## Authority Flow

```mermaid
flowchart TD
  A[AIH Login / User Identity] --> B[Verified User Context]
  B --> C[Salon Ownership Resolver]
  C --> D[Signed VMB Salon Authority]
  D --> E[Salon-Scoped API Access]
  E --> F[Send / Timeline / Redeem Permissions]
```

## Authority Rules
- Do not trust plain salon IDs from body, query, or unsigned cookies.
- Salon-scoped APIs must derive authority from signed/verifiable context.
- Cross-salon send, list, claim visibility, and redeem actions must be rejected.
- Old unsigned sessions are intentionally invalid after the signed-authority patch.

## MVP Rule
A salon owner can only create, view, and redeem invites for salons they are authorized to operate.
