# UI styling contract (long-term)

**Status:** Enforced from LT styling foundation (dashboard CTA migration).

## Goals

- Styles ship in the same deploy unit as markup (no orphaned `globals.css` feature blocks).
- One design language via tokens + `components/ui` primitives.
- Production cannot regress to browser-default buttons when globals drift.

## Allowed mechanisms

| Mechanism | Use for |
|-----------|---------|
| `components/ui/*` + `cn()` | Buttons, CTA cards, inputs, badges (CVA variants) |
| Tailwind utilities on JSX | Layout, spacing, responsive grids |
| `*.module.css` (co-located) | Rare: animations/grids Tailwind cannot express cleanly |

## `globals.css` — only

1. `@tailwind` directives  
2. `:root` design tokens and minimal `@layer base` reset  
3. **App layout shell** (`.app-sidebar`, `.app-main`, `.app-content-pad`, …)  
4. Legacy blocks **until migrated** — do not add new feature selectors  

## Forbidden for new code

- New `.dashboard-*`, `.msg-vault-*`, `.aihsafe-*`, `.studios-*` feature blocks in `globals.css`
- Naked `<button>` without `Button` / `CtaCard` / explicit Tailwind reset classes
- Client `<style>` for theme colors (use tokens or Tailwind)
- Inline `style={{}}` for colors, borders, padding (inline only for dynamic geometry)

## Tokens

Defined in `app/globals.css` `:root`:

- `--surface`, `--surface-elevated`, `--border-subtle`, `--border-muted`
- `--ink`, `--muted`, `--muted-body`, `--accent`, `--urgent`, `--urgent-ink`
- `--shadow-card`, `--shadow-card-hover`

Primitives should prefer `var(--token)` or matching Tailwind utilities.

## CI

```bash
npm run check:globals-css
```

Fails if removed selectors (e.g. `.dashboard-activity-cta`) reappear in `globals.css`.

## Migration order (remaining debt)

1. Dashboard private threads / rail (`globals.css` `.dashboard-private-*`)
2. Msg Vault shell (`.msg-vault-*`, `.thread-*`)
3. AIH Safe (`.aihsafe-*`)
4. Inline styles in `AppShell` / heroes → `ui/*` + Tailwind
