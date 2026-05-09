// AIH Safe — Audit Service
// createAuditEventDraft: pure synchronous factory — no side effects.
// emitAuditEvent: writes to aih_audit_events table (Phase 3+ — persistence now live).
// getAuditEventsForTarget: queries aih_audit_events by targetId.
//
// Must never make governance decisions.
// Must never delete audit events.
// actorId / targetId are stored as plain strings (no FK — legal hold requirement).

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { AuditEventEnvelope } from "@/types/aihsafe/audit-events";
import type { CreateAuditEventInput, AuditEventDraft } from "@/types/aihsafe/audit";
import { mapAuditEvent } from "@/lib/aihsafe/mappers";

// ─── createAuditEventDraft ────────────────────────────────────────────────────

/**
 * Pure synchronous factory — creates an AuditEventDraft from the provided input.
 * No DB writes. No side effects. Safe to call in any context.
 */
export function createAuditEventDraft(input: CreateAuditEventInput): AuditEventDraft {
  return {
    kind:                 input.kind,
    actorId:              input.actorId,
    targetId:             input.targetId,
    meta:                 input.meta,
    createdAt:            new Date().toISOString(),
    _persistenceDeferred: true,
  };
}

// ─── emitAuditEvent ───────────────────────────────────────────────────────────

/**
 * Write an audit event to aih_audit_events and return the persisted envelope.
 * Phase 3: persistence is now live — writes to DB synchronously.
 * Callers must not assume the event is available immediately for read-after-write
 * consistency across replicas; for the current single-DB setup this is safe.
 */
export async function emitAuditEvent(
  input: CreateAuditEventInput
): Promise<AuditEventEnvelope> {
  const row = await prisma.aihAuditEvent.create({
    data: {
      kind:     input.kind,
      actorId:  input.actorId,
      targetId: input.targetId ?? null,
      meta:     input.meta as Prisma.InputJsonValue,
    },
  });
  return mapAuditEvent(row);
}

// ─── getAuditEventsForTarget ──────────────────────────────────────────────────

/**
 * Retrieve audit events for a target resource, newest first.
 * limit defaults to 50; max enforced at call site (API route).
 */
export async function getAuditEventsForTarget(
  targetId: string,
  limit = 50
): Promise<AuditEventEnvelope[]> {
  const rows = await prisma.aihAuditEvent.findMany({
    where:   { targetId },
    orderBy: { createdAt: "desc" },
    take:    Math.min(limit, 200),
  });
  return rows.map(mapAuditEvent);
}
