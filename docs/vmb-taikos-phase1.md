# VMB tAIkOS Phase 1

tAIkOS is the **operating layer** above VMB salon pages. Pages are presentation; tAIkOS is the product surface for context, recommendations, navigation, and future execution.

**Repo path note:** This codebase uses `lib/taikos/` and `components/taikos/` (not `src/lib/…`) per existing `@/*` layout.

## File map

```
lib/taikos/
  types.ts                    # AiosResponse schema
  paths.ts                    # Session JSON storage
  context/
    context-builder.ts        # AiosContextPacket from VMB data
    client-summary-builder.ts # Book analysis signals
    page-registry.ts          # Page id / actions registration
  session/
    session-manager.ts        # Login + briefing rules
    session-store.ts          # Persistent session records
  orchestrator/
    morning-briefing.ts       # Deterministic briefing engine
  rules/
    birthday-rule.ts
    reactivation-rule.ts
    open-slot-rule.ts
    pcn-invite-rule.ts
    referral-rule.ts
    index.ts
  adapters/
    mock.ts                   # Default — no LLM
    openai.ts                 # Stub
    local.ts                  # Stub
    index.ts                  # generateAiosResponse()
  tools/
    page-context-tool.ts

components/taikos/
  AiosProvider.tsx            # Global state, idle collapse, auto-briefing
  AiosPanel.tsx               # Center concierge panel
  AiosLauncher.tsx            # ✨ AIOS topbar button

app/api/taikos/
  context/route.ts
  briefing/route.ts
  session/route.ts
```

## Data flow

```
VMB cookie → workspace → analysis → context-builder → AiosContextPacket
                                              ↓
                                    rules + morning-briefing
                                              ↓
                                    generateAiosResponse() → mock adapter
                                              ↓
                                    AiosPanel (schema-driven UI)
```

## Integration

- `VmbSalonShell` wraps salon routes with `AiosProvider` and shows `AiosTopbarLauncher` in the top bar.
- Landing (`/vmb`) and first-time start shell are unchanged.
- No external LLM required; set `AIOS_ADAPTER=mock` (default).

## Session rules

| Login today | Behavior |
|-------------|----------|
| First | Full morning briefing (auto-open) |
| Second | Abbreviated update |
| Later | Only if `newActivity` on book/workspace |

Idle 30s → week summary message → panel collapses (non-blocking).

## Phase 2 recommendations

1. Wire `openai` / `local` adapters with schema validation
2. Tool execution (send invite, approve draft) behind confirmation gates
3. Durable session store (Postgres) instead of JSON files
4. Event stream for `newActivity` (draft approved, PCN join, etc.)
5. Per-page action handlers registered from route modules

## Production note

TaiKos is listed as a production carve-out for trust-boundary work. Phase 1 is deterministic + mock adapter only — review before exposing to production salons at scale.
