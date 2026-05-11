# Founder Settings Flow

Documents how `AihFounderSettings` is created, read, updated, and consumed
by the policy resolution layer.

---

## Data model

```
aih_founder_settings (singleton — id = "singleton")
  id:                              "singleton"  (fixed string — enforces one row)
  founderUserId:                   string?      (last writer — audit only, no FK)
  requireGuardianApprovalForMinors: boolean     default true
  allowMinorInvites:               boolean      default false
  allowMinorPosting:               boolean      default true
  allowMinorExternalLinks:         boolean      default false
  defaultVisibilityScope:          string       default "family"
  enableTrustedAdults:             boolean      default true
  enablePrivateThreads:            boolean      default true
  createdAt / updatedAt:           DateTime
```

---

## Creation flow (first GET)

```
Founder opens Settings tab
  │
  └─► FounderSettingsEditor mounts
        │
        └─► GET /api/aihsafe/founder-settings
              │
              ├─ requireAuth() → user.role check (founder/admin only — 403 otherwise)
              │
              └─ prisma.aihFounderSettings.upsert({
                   where:  { id: "singleton" },
                   create: { id: "singleton", founderUserId: user.id, ...schema defaults },
                   update: {},
                 })
                 → row (new or existing)
                 → FounderSettingsDTO returned to UI
```

After the first GET, the row always exists. Subsequent GETs hit `update: {}` (no-op).

---

## Update flow (toggle/select change)

```
Founder changes a toggle
  │
  ├─ Optimistic update: setSettings({ ...settings, [field]: newValue })
  │
  └─► PATCH /api/aihsafe/founder-settings
        │
        ├─ requireAuth() → role check
        │
        ├─ PatchSchema.safeParse(body) — validates each field; rejects invalid scopes
        │
        ├─ prisma.aihFounderSettings.upsert({
        │    where:  { id: "singleton" },
        │    create: { id: "singleton", founderUserId, ...patch },
        │    update: { founderUserId, ...patch },
        │  })
        │
        ├─ emitAuditEvent(FOUNDER_SETTINGS_UPDATED, actorId=user.id, targetId="singleton", meta={patch})
        │   (fire-and-forget — never blocks the response)
        │
        └─ FounderSettingsDTO returned → UI confirms with "✓ Saved"
```

On network error or non-ok response, the UI rolls back the optimistic update and
reloads from the server.

---

## Policy resolution consumption

```
resolvePolicyProfile(userId)
  [lib/aihsafe/policy/resolvePolicyProfile.ts]
  │
  ├─ loadFounderSettings()
  │     └─ prisma.aihFounderSettings.findFirst()
  │           → FounderSettingsData | null
  │           (null only before the first GET — auto-create hasn't run yet)
  │
  └─ buildDefaultPolicyProfile(userId, ageTier, founderSettings, sourceType)
        │
        If founderSettings !== null:
          sourceType = FOUNDER_DEFAULT
          postingDefaults: consults founderSettings.allowMinorPosting,
                           founderSettings.requireGuardianApprovalForMinors
          inviteDefaults:  consults founderSettings.allowMinorInvites
          visibilityDefaults: consults founderSettings.defaultVisibilityScope (ADULT/ELDER)
          escalationDefaults: consults founderSettings.requireGuardianApprovalForMinors
        │
        If founderSettings === null:
          sourceType = SYSTEM_DEFAULT
          all values use hardcoded safe defaults
```

The policy layer reads founder settings on every `resolvePolicyProfile()` call.
Once the Settings tab has been opened (creating the row), all future policy
resolutions will use `FOUNDER_DEFAULT` provenance.

---

## Enforcement coverage map

| Founder setting | Where enforced | Enforcement path |
|---|---|---|
| `requireGuardianApprovalForMinors` | Policy layer | `buildDefaultPolicyProfile()` → `posting.requiresGuardianApproval`, `escalation.*` |
| `allowMinorPosting` | Policy layer | `buildDefaultPolicyProfile()` → `posting.allowed` for CHILD/PRETEEN/TEEN |
| `allowMinorInvites` | Policy layer | `buildDefaultPolicyProfile()` → `invite.allowed` for CHILD/PRETEEN/TEEN |
| `defaultVisibilityScope` | Policy layer | `buildDefaultPolicyProfile()` → `visibility.defaultScope` for ADULT/ELDER |
| `allowMinorExternalLinks` | ❌ Not yet enforced | Persisted, future Agent 41 |
| `enableTrustedAdults` | ❌ Not yet enforced | Persisted, future guardian-link UI agent |
| `enablePrivateThreads` | ❌ Not yet enforced | Persisted, future trust-unit creation agent |

**Important:** The governance kernel (`lib/aihsafe/governance/index.ts`) does NOT read
founder settings. Kernel functions are pure, deterministic, and side-effect-free — they
do not perform DB lookups. Founder settings influence policy only through
`resolvePolicyProfile()`, which sits above the kernel. API routes that call kernel
functions directly (without also calling `resolvePolicyProfile()`) will not reflect
founder overrides until those routes are wired to the policy layer.

---

## Default behavior when row does not exist

- `GET /api/aihsafe/founder-settings` → auto-creates with schema defaults → never returns null
- `resolvePolicyProfile()` → `findFirst()` returns null → uses `PolicySourceType.SYSTEM_DEFAULT` → all hardcoded safe values
- No crashes anywhere — null settings is a valid state handled everywhere

---

## Access control summary

| Actor | GET | PATCH |
|---|---|---|
| Unauthenticated | 401 | 401 |
| `member` role | 403 | 403 |
| `admin` role | ✅ 200 | ✅ 200 |
| `founder` role | ✅ 200 | ✅ 200 |
| UNKNOWN age-tier user | 403 if not founder/admin | 403 if not founder/admin |
| Child / teen | 403 if not founder/admin (impossible by role) | 403 |

Child and teen users can never have `role = "founder"` or `"admin"` — the role
is set at registration and can only be changed by an admin. The API access control
is therefore both role-based AND implicitly age-gated.
