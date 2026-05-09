# Agent 10 — Trust Unit Display Name DTO Patch

**Branch:** `aihsafe-agent-8-ux-shell`
**Date:** 2026-05-09

---

## Files changed

| File | Change |
|---|---|
| `types/aihsafe/dto.ts` | Added `name?: string` to `TrustUnitDTO` |
| `lib/aihsafe/mappers/prisma-to-aihsafe.ts` | Added schema-gap comment to `mapTrustUnit` |
| `app/api/aihsafe/trust-units/route.ts` | Added Phase 4 comment in `toTrustUnitDTO` |
| `components/aihsafe/invite/InvitePanel.tsx` | Trust unit option shows `name` if present |
| `components/aihsafe/membership/MembershipPanel.tsx` | Space heading shows `name` if present; kind shown as subline when name exists |
| `docs/aihsafe/agent-10-dto-name-patch-report.md` | This file |

---

## DTO change

`TrustUnitDTO` in `types/aihsafe/dto.ts`:

```typescript
// before
export interface TrustUnitDTO {
  id:    string;
  kind:  TrustUnitKind;
  // ...

// after
export interface TrustUnitDTO {
  id:    string;
  name?: string;   // optional — present once AihTrustUnitMeta.name column exists
  kind:  TrustUnitKind;
  // ...
```

The field is optional (`?`) so all existing callers continue to compile without changes.

---

## Mapper change

### `lib/aihsafe/mappers/prisma-to-aihsafe.ts` — `mapTrustUnit`

No code change. Added a comment documenting why `name` is absent:

> `name` is not mapped here: `TrustUnit` and `AihTrustUnitMeta` both lack a name column
> until Phase 4 adds `AihTrustUnitMeta.name`. The `TrustUnitDTO` layer carries `name?: string`
> and will populate it once the column exists.

### `app/api/aihsafe/trust-units/route.ts` — `toTrustUnitDTO`

Added a `// Phase 4` comment at the `name` position in the returned object literal. The field is intentionally absent from the return value (TypeScript accepts this for optional DTO fields) so no `undefined` is explicitly serialised into the JSON response.

---

## UX display changes

### `InvitePanel` trust unit dropdown

**Before:** `{u.kind} · {u.id.slice(0, 6)}`
**After:** `{u.name ?? `${u.kind} · ${u.id.slice(0, 6)}`}`

When `name` is populated: shows the user's chosen name ("Summer pod").
When `name` is absent: shows the existing kind+id fallback ("peer · abc123").

### `MembershipPanel` space card heading

**Before:** `{unit.kind} space` (e.g. "Peer space")
**After:** `{unit.name ?? `${unit.kind} space`}` (e.g. "Summer pod" or "Peer space")

When `name` is present, the `kind` label is surfaced in the sub-line instead of the heading so the space type remains visible:

```
Summer pod          ← heading (from name)
peer · 2 members · joined 5/9/2026 · abc12345…   ← sub-line (kind promoted here)
```

When `name` is absent, the heading stays `Peer space` and the sub-line is unchanged.

---

## Schema gap — why `name` is always `undefined` today

Neither `TrustUnit` nor `AihTrustUnitMeta` has a `name` column in `prisma/schema.prisma`. The route's `...(name ? { name } : {})` create call spreads an empty object when name is provided (Prisma silently ignores unknown fields at the type level due to conditional spread), meaning **no name is persisted to the database today**.

Phase 4 migration required:

```prisma
model AihTrustUnitMeta {
  // ... existing fields ...
  name  String?   // add this column
}
```

After the migration: update `toTrustUnitDTO` to read `name: row.aihMeta?.name ?? undefined` and the UX displays will light up automatically — no further UX changes needed.

---

## Validation

- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **clean**, no new warnings
