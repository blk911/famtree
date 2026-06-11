# VMB MVP Integration Map

The old MVP/back-office stack is the **engine room**. The `/vmb` salon shell is the **salon product**. Salon owners never see admin, Market Intel, or legacy SaaS chrome.

## Engine room modules

| Module | Location | Role |
|--------|----------|------|
| Trial + cookie | `lib/vmb/trial-store.ts`, `app/api/vmb/trial` | Salon session (`vmb_trial_id`) |
| Workspace lifecycle | `lib/vmb/workspace-store.ts`, `lib/vmb/workspace-lifecycle.ts` | Persistent salon workspace, `latestAnalysisId` |
| Book ingest + parse | `lib/vmb/provider-ingest/`, `lib/vmb/run-book-analysis.ts` | CSV/sample ingest (used by `/vmb/start` only) |
| Analysis store | `lib/vmb/book-analysis/analysis-store.ts` | `VmbBookAnalysisResult` per trial |
| Operating snapshot | `lib/vmb/operating-system/` | Weekly feed sections (network, welcomes, revenue) |
| Client opportunities | `lib/vmb/client-opportunities.ts` | Client Book scoring rows |
| Invite drafts | `lib/vmb/invites/`, `lib/vmb/invite-drafts/` | Draft messages from analysis |
| Trusted intros | `lib/vmb/trusted-intro*`, `app/api/vmb/trusted-intro` | Intro request engine (network) |
| Active analysis resolver | `lib/vmb/active-analysis-resolver.ts` | Canonical analysis id resolution |
| Page context loader | `lib/vmb/load-vmb-page-context.ts` | Server: cookie → workspace → analysis |

**Storage:** `runtime-data/vmb/*.json` (local) · `/tmp/vmb/*.json` (Vercel, ephemeral)

## Salon-facing routes

| Route | Shell | Integration status |
|-------|-------|-------------------|
| `/vmb` | None (landing) | Live — marketing only |
| `/vmb/start` | `VmbStartShell` | Live — ingest (do not redesign) |
| `/vmb/dashboard` | `VmbSalonShell` | Live — weekly feed → Invites handoff |
| `/vmb/invites` | `VmbSalonShell` | **Live** — draft queues + preview/approve/skip |
| `/vmb/clients` | `VmbSalonShell` | Live — client book from analysis |
| `/vmb/network` | `VmbSalonShell` | Partial — trusted intros + draft peek |
| `/vmb/appointments` | `VmbSalonShell` | Placeholder |
| `/vmb/offers` | `VmbSalonShell` | Placeholder |
| `/vmb/history` | `VmbSalonShell` | Placeholder |
| `/vmb/settings` | `VmbSalonShell` | Placeholder |

## Data flow

```
/vmb/start
  → POST /api/vmb/trial (cookie)
  → POST /api/vmb/analyze-book
  → workspace.latestAnalysisId
  → /vmb/dashboard?analysis={id}

Salon app page
  → vmb_trial_id cookie
  → loadVmbPageContext() or client resolver
  → VmbSalonWorkspace
  → VmbBookAnalysisResult
  → page view (feed, invites, clients, placeholder)
```

## What is live

- Ingest → workspace → dashboard without re-upload
- Left salon rail + analysis-preserving nav
- Home weekly sections with links to `/vmb/invites?section=…`
- Invite draft builder (network, welcomes, revenue, trusted intro)
- Invite preview / save / approve / skip (no send yet)
- Client Book from active analysis

## What is placeholder

- Appointments, Service Offers, History (UI shell + workspace context)
- Settings
- Sent invites + replies
- Email send

## Never surface to salon owner

- `/admin/**`, Market Intel, Transpo, HCare, Labs
- Legacy routes: `/vmb/campaigns`, `/vmb/opportunities`, `/vmb/revenue` (archive UI — not in rail)
- `VmbCampaignsView`, `VmbOpportunitiesView`, `VmbRevenueView` (not linked from salon shell)
- Global trial/analysis lists
- Raw JSON stores or ingest internals

## Engine inventory (old → new)

| Old feature | Old location | New destination | Reuse |
|-------------|--------------|-----------------|-------|
| Invite drafts | `lib/vmb/invite-drafts/` | `/vmb/invites` | Reuse logic + extend categories |
| Trusted intros | `app/api/vmb/trusted-intro` | `/vmb/network` (partial) | Reuse data only |
| Service presets | `lib/vmb/operating-system/standard-offers.ts` | `/vmb/offers` (placeholder) | Reuse logic later |
| Campaign UI | `VmbCampaignsView` | Archive | Archive UI |
| Opportunities UI | `VmbOpportunitiesView` | Archive | Archive UI |
| Client analysis | `lib/vmb/client-opportunities.ts` | `/vmb/clients` | Reuse logic |
| Opportunity scoring | `lib/vmb/operating-system/` | Home + Invites | Reuse logic |
| Revenue attribution | `weekly-revenue.ts` | Home → Invites `revenue_touch` | Reuse logic |
| Provider ingest | `lib/vmb/provider-ingest/` | `/vmb/start` only | Reuse logic |
| History/campaigns | legacy views | `/vmb/history` placeholder | Reuse data later |
