# Studios as Published Spaces

**Status:** Architecture target (Agent 92)  
**Principle:** Studios emerge **from** AIH Spaces — not a parallel app universe.

---

## Stack

```
AIH Core
├── Identity (User, Profile, sessions)
├── Invite graph (Invite, identity challenge, registration)
├── Relationships (invitedById, tree, Trust Units, Family Units)
├── Msg Vault (AihMsg*, threads, notices, governance events)
├── Boundaries / Msg Rules (policy profiles, visibility)
├── Governance (approvals, guardian, founder settings)
└── Trust spaces (TrustUnit, FamilyUnit, DashboardSpace*)

Studio (presentation layer)
├── Branded public preview (`/studios/[slug]`)
├── Hero triad + content modules (templates, local draft)
├── Location / map presentation
├── Request invite / access CTA (must route to AIH Invite)
└── Member experience → existing private Space + Msg Vault (not a Studio inbox)
```

\* `DashboardSpace` today is a **timeline scope** (BUSINESS/CLUB/CHURCH posts), not the same as Trust Units — consolidation is a future schema decision. See boundary map.

---

## Concepts

| Term | Meaning |
|------|---------|
| **Space** | Governed operating container — membership, rules, messaging scope |
| **Published Studio** | Branded, optional-public **presentation** of a Space (or Space-bound offering) |
| **Studio Owner** | Steward who owns the published layer and underlying Space membership |
| **Prospect** | Visitor on public preview — no Studio-specific account |

---

## What a Published Studio owns

- Public preview page layout (hero, videos, benefits, map copy)
- Branding tokens (name, tagline, accent, media URLs)
- Publish on/off for preview
- Request-access / invite CTA copy and placement
- Service tier **display** (pricing cards) — not payment rails

## What it must NOT own

- Separate user accounts
- Studio-only invite tokens or email flows
- Studio-only messaging / inbox (Concierge is lead capture, not member Msg Vault)
- Duplicate relationship graph
- Parallel admin roles disconnected from AIH governance

---

## Data direction (no schema change in Agent 92)

Today:

- `Studio` (Prisma) — slug, owner, tiers, voice profile
- Trust Units / Family Units — AIH Safe APIs
- No `studio.spaceId` FK yet

Target:

```text
TrustUnit | FamilyUnit  (governed Space)
       │
       └── PublishedStudioProfile  (1:1 or 1:n presentation)
              slug, publicEnabled, templateId, hero draft JSON, media refs
```

Linking Studios to `trustUnitId` / `familyUnitId` is a **future migration** — stop and design before adding columns.

---

## Access path (canonical)

```text
Public /studios/[slug]
  → Request access / invite intent (AIH Invite API + identity gate)
  → Accepted membership in governed Space
  → Private threads / Msg Vault under that Space scope
```

`/studios/pvt-net-login` remains a **placeholder** until it redirects into Msg Vault or Space home — not a second login system.

---

## Related docs

- [studio-creation-flow.md](./studio-creation-flow.md)
- [studio-aih-boundary-map.md](./studio-aih-boundary-map.md)
- [agent-92-published-spaces-architecture-report.md](./agent-92-published-spaces-architecture-report.md)
