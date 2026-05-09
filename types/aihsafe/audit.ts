// AIH Safe Governance — deterministic contract only. No persistence, no UI.
//
// Audit types for the governance kernel.
// AuditEventDraft is the pre-persistence record returned by emitAuditEvent.
// The canonical post-persistence record is AuditEventEnvelope in audit-events.ts.
// These are kept separate so the draft can exist without a DB round-trip.

import type { AuditEventKind } from "./audit-events";

// ─── Audit Event Draft ─────────────────────────────────────────────────────────
// Returned by emitAuditEvent before persistence.
// Does NOT have an id — id is assigned on write to the DB (Phase 2+).

export interface CreateAuditEventInput {
  kind:     AuditEventKind;
  actorId:  string;                      // AIHUserId as string (no branded type at persistence boundary)
  targetId: string | null;
  meta:     Record<string, unknown>;
}

export interface AuditEventDraft {
  kind:                 AuditEventKind;
  actorId:              string;
  targetId:             string | null;
  meta:                 Record<string, unknown>;
  createdAt:            string;           // ISO 8601 — set at draft creation, not at persistence
  _persistenceDeferred: true;             // marker — id will be assigned when persisted
}
