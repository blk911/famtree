# VMB landing design freeze

## Frozen route

`/vmb` — the public VMB salon landing page.

## Allowed changes

- Button and link targets (e.g. trial start, demo/results routes)
- Form wiring and API integration when requested
- Copy edits explicitly requested by the product owner

## Disallowed changes (without explicit request)

- Hero layout (two-column hero, video slot, headline structure)
- Section reordering or removal of comparison, existing-book, how-it-works, or trial sections
- Card redesign (comparison cards, growth bullets, step cards)
- Nav redesign on the landing page (landing renders without `VmbShell`)
- New proof-chip rows or similar layout additions under the hero

## Implementation note

The frozen landing lives in `components/vmb/VmbLanding.tsx`. Sub-routes under `/vmb/*` use `VmbShell` via `VmbLayoutGate` in `app/vmb/layout.tsx`.
