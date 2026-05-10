// AIH Safe — Mapper Layer
// Centralizes all branded ID casts and Prisma → AIH Safe DTO conversions.
// This is the ONLY place where `as BrandedType` casts are permitted for Prisma records.
// All other code receives already-typed AIH Safe values.

import type {
  AihGuardianRelationship,
  AihTrustUnitMeta,
  TrustUnit as PrismaTrustUnit,
  TrustUnitMember as PrismaTrustUnitMember,
  ConnectionRequest as PrismaConnectionRequest,
  AihAuditEvent as PrismaAuditEvent,
} from "@prisma/client";

import type { TrustUnit, TrustUnitMembership, RelationshipEdge } from "@/types/aihsafe/trust-units";
import type { GuardianRelationship } from "@/types/aihsafe/guardian";
import type { AuditEventEnvelope } from "@/types/aihsafe/audit-events";

import {
  asAIHUserId,
  asTrustUnitId,
  asMembershipId,
  asGuardianId,
  asChildId,
  asGuardianRelationshipId,
  asAuditEventId,
} from "@/types/aihsafe/ids";

import { TrustUnitKind } from "@/types/aihsafe/trust-units";
import { GuardianRelationshipKind, GuardianPermissionLevel } from "@/types/aihsafe/guardian";
import { ApprovalState } from "@/types/aihsafe/approval-states";
import { RelationshipEdgeKind } from "@/types/aihsafe/trust-units";
import { TrustUnitRole } from "@/types/aihsafe/roles";

// ─── Prisma TrustUnit + sidecar → AIH Safe TrustUnit ─────────────────────────

type PrismaTrustUnitWithMembers = PrismaTrustUnit & {
  members: PrismaTrustUnitMember[];
  aihMeta: AihTrustUnitMeta | null;
};

export function mapTrustUnit(row: PrismaTrustUnitWithMembers): TrustUnit {
  const kind = mapAihTrustUnitKind(row.aihMeta?.kind ?? null);
  // name lives on AihTrustUnitMeta (added Phase 4). mapTrustUnit builds the internal
  // TrustUnit graph type (no name field) used by governance; the DTO layer reads name
  // directly from the sidecar row via toTrustUnitDTO in the route.
  return {
    id:          asTrustUnitId(row.id),
    kind,
    memberIds:   row.members.map(m => asAIHUserId(m.userId)),
    status:      row.status === "ACTIVE" ? "active" : "dissolved",
    createdAt:   row.createdAt.toISOString(),
    dissolvedAt: null,
  };
}

function mapAihTrustUnitKind(kind: string | null): TrustUnit["kind"] {
  switch (kind) {
    case "family":   return TrustUnitKind.FAMILY;
    case "peer":     return TrustUnitKind.PEER;
    case "extended": return TrustUnitKind.EXTENDED;
    case "guardian": return TrustUnitKind.GUARDIAN;
    default:         return TrustUnitKind.PEER;
  }
}

// ─── Prisma TrustUnitMember → AIH Safe TrustUnitMembership ───────────────────

export function mapTrustUnitMembership(row: PrismaTrustUnitMember): TrustUnitMembership {
  return {
    id:          asMembershipId(row.id),
    trustUnitId: asTrustUnitId(row.trustUnitId),
    userId:      asAIHUserId(row.userId),
    role:        TrustUnitRole.MEMBER,  // existing TrustUnitMember has no role column — default MEMBER
    joinedAt:    row.createdAt.toISOString(),
    exitedAt:    null,                  // existing TrustUnitMember has no exitedAt column — default null
  };
}

// ─── Prisma AihGuardianRelationship → AIH Safe GuardianRelationship ──────────

export function mapGuardianRelationship(row: AihGuardianRelationship): GuardianRelationship {
  return {
    id:              asGuardianRelationshipId(row.id) as unknown as import("@/types/aihsafe/ids").GuardianId,
    guardianUserId:  asAIHUserId(row.guardianUserId) as unknown as import("@/types/aihsafe/ids").UserId,
    childUserId:     asChildId(row.childUserId),
    kind:            mapGuardianKind(row.kind),
    permissionLevel: mapGuardianPermLevel(row.permissionLevel),
    establishedAt:   row.establishedAt.toISOString(),
    revokedAt:       row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

function mapGuardianKind(kind: string): GuardianRelationship["kind"] {
  switch (kind) {
    case "parent":         return GuardianRelationshipKind.PARENT;
    case "grandparent":    return GuardianRelationshipKind.GRANDPARENT;
    case "legal_guardian": return GuardianRelationshipKind.LEGAL_GUARDIAN;
    case "trusted_adult":  return GuardianRelationshipKind.TRUSTED_ADULT;
    default:               return GuardianRelationshipKind.TRUSTED_ADULT;
  }
}

function mapGuardianPermLevel(level: string): GuardianRelationship["permissionLevel"] {
  switch (level) {
    case "view_only":    return GuardianPermissionLevel.VIEW_ONLY;
    case "approver":     return GuardianPermissionLevel.APPROVER;
    case "full_control": return GuardianPermissionLevel.FULL_CONTROL;
    default:             return GuardianPermissionLevel.VIEW_ONLY;
  }
}

// ─── Prisma ConnectionRequest → AIH Safe RelationshipEdge ────────────────────
// ConnectionRequest is the Phase 3 proxy for RelationshipEdge until a dedicated table exists.

export function mapConnectionRequestToEdge(row: PrismaConnectionRequest): RelationshipEdge {
  return {
    fromUserId:    asAIHUserId(row.requesterId),
    toUserId:      asAIHUserId(row.targetId),
    kind:          RelationshipEdgeKind.CONNECTION,
    approvalState: mapConnectionStatus(row.status),
    establishedAt: row.createdAt.toISOString(),
    revokedAt:     null,
  };
}

function mapConnectionStatus(status: string): RelationshipEdge["approvalState"] {
  switch (status) {
    case "ACCEPTED": return ApprovalState.APPROVED;
    case "DECLINED": return ApprovalState.DENIED;
    default:         return ApprovalState.PENDING;
  }
}

// ─── Prisma AihAuditEvent → AIH Safe AuditEventEnvelope ──────────────────────

export function mapAuditEvent(row: PrismaAuditEvent): AuditEventEnvelope {
  return {
    id:        asAuditEventId(row.id) as unknown as string,
    kind:      row.kind as AuditEventEnvelope["kind"],
    actorId:   row.actorId,
    targetId:  row.targetId ?? null,
    createdAt: row.createdAt.toISOString(),
    meta:      row.meta as Record<string, unknown>,
  };
}
