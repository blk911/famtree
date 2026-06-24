# VMB Admin Pipeline Map

## Purpose
This map separates admin/back-office work from the client-facing money rail.

## Admin Pipeline

```mermaid
flowchart TD
  A[Admin Dashboard\n/admin\nPipeline overview] --> B[Build Intake\n/admin/build\nSource intake and runtime generation]
  B --> C[Validate Queue\n/admin/validate\nApprove, merge, reject candidates]
  C --> D[Target Resolver\n/admin/target\nResolve salon/operator targets]
  D --> E[Activate\n/admin/activate\nPrepare outreach/actions]
  E --> F[Salon Invitation Approval\nApproval snapshot created]
  F --> G[Send Package Preview\nPreview only until SentInvite is created]
  G --> H[Canonical SentInvite Rail\nProduction transaction begins]
```

## Admin vs Money Rail
Admin approval is not the transaction.

A send package preview is not the transaction.

The transaction begins only when `/api/vmb/sent-invites` creates a canonical `SentInvite`.

## Risk Boundary
Legacy/generated/runtime artifacts can support sourcing, enrichment, preview, and reconciliation, but they must not own claim or redemption state.
