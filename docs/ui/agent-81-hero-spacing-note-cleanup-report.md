# Agent 81 — Page hero spacing + instructional note cleanup

**Branch:** `aihsafe-agent-81-hero-spacing-note-cleanup`  
**Date:** 2026-05-20

## Summary

Standardized vertical rhythm below `AppPageHero` (Dashboard reference: 30px hero bottom margin, 20px section gap, 900px content width). Removed long instructional paragraphs from My Network, Units, and Family Safe overview cards. Preserved error banners, child boundary copy, governance rail labels, and mute/hide tooltips on controls.

## Hero spacing standardized

| Token / class | Value | Used on |
|---------------|-------|---------|
| `AppPageHero` | `marginBottom: 30px` | Dashboard, My Network (`/tree`), Units |
| `.vault-hero-section` | `margin-bottom: 30px` | Family Safe in-page hero |
| `.msg-vault-page-hero` | `margin-bottom: 30px` | Msg Vault header |
| `.app-page-body` | `gap: 20px` | Tree main, Units sections, network grid wrapper |
| `.app-page-shell--family-safe` | `max-width: 900px`, `gap: 16px` | `/aihsafe` (matches AppShell content) |
| `.app-page-shell--msg-vault` | `max-width: 900px` | `/msg-vault` |

Family Safe no longer adds extra `24px` outer padding on top of `app-content-pad`.

## Notes removed / replaced

| Location | Before | After |
|----------|--------|-------|
| `TreeList` default | Long “Your view only…” paragraph | Default `privacyNote="none"`; hints on mute/hide buttons only |
| `/tree` page | (inherited full note) | Explicit `privacyNote="none"` |
| `/family-vault/family-units` | Invite-only sponsor essay | Section titles + short empty states |
| `RelationshipVisibilityCard` | “Why someone can see you” checklist + privacy footer | One-line header; circle chips only |
| `FounderShell` hero | Long marketing descriptions | One-line subtitles |
| `MsgVaultShell` hero / overview | Multi-sentence governance essay | Short hero line; child notice only on overview |

## Pages checked

- `/dashboard` — reference layout unchanged (`dashboard-member-stack`)
- `/tree` (My Network) — hero copy updated in `AppPageHero`; `app-page-body` + rail grid
- `/family-vault/family-units` (Units) — hero via `AppPageHero`; Agent 79 active/draft TU display kept
- `/aihsafe` (Family Safe) — shell spacing + trimmed overview card
- `/msg-vault` — width + hero rhythm aligned

## Preserved (not removed)

- Load/error banners, pending approval UI, child Boundaries / escalation blocks
- `GovernanceRailProfile` child Boundaries section
- Invite consent and destructive warnings elsewhere
- Tree mute/hide `title` tooltips (accessibility for actions)

## Msg Vault hero fix (post-QA)

**Issue:** Custom in-page hero was full-width with only left-aligned lock + title, leaving a large empty gradient band on the right (looked broken vs Dashboard `AppPageHero` with avatar).

**Fix:** Removed duplicate `MsgVaultShell` header; enabled shared `AppPageHero` for `/msg-vault` (title, subtitle, avatar, 24px radius, 30px bottom margin). Unread notices remain on the Notices tab badge.

## Remaining visual gaps

- `/tree` route label in nav is still “My People” while hero title is “My Network” (nav rename out of scope).
- Family Safe inner tabs use `maxWidth: 680` on some panels — intentional narrow forms.
- `content-col` (680px) still used on feed/profile pages not in this mission.

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npx next build` | Pass |
