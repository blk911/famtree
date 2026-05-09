// AIH Safe Core Graph — foundational contract only. No persistence, no UI, no permissions.
//
// Trust unit and relationship graph types.
// These are read-only DTO projections and graph primitives.
// Source of truth for existing TrustUnit data is prisma/schema.prisma.
// AIH Safe FamilyUnit model is defined in Phase 1.

import type { TrustUnitId, AIHUserId, UserId, InviteId, MembershipId } from "./ids";
import type { TrustUnitRole } from "./roles";
import type { ApprovalState } from "./approval-states";

// ─── Trust Unit Kind ──────────────────────────────────────────────────────────

export const TrustUnitKind = {
  FAMILY:    "family",    // family-based trust unit (guardian + children + adults)
  PEER:      "peer",      // peer-group trust unit (adults of similar standing)
  EXTENDED:  "extended",  // extended family or cross-family trust group
  GUARDIAN:  "guardian",  // guardian-child dedicated unit (1 guardian + 1+ children)
} as const;
export type TrustUnitKind = (typeof TrustUnitKind)[keyof typeof TrustUnitKind];

// ─── Trust Unit ────────────────────────────────────────────────────────────────

// Legacy DTO — projection of existing Prisma TrustUnit (3-person, no kind field).
// Retained for backward compat with existing trust graph code.
export interface AIHTrustUnit {
  id:        TrustUnitId;
  memberIds: UserId[];   // exactly 3 in current system
  status:    "active";
  createdAt: string;     // ISO 8601
}

// Full AIH Safe TrustUnit — includes kind and is the canonical type for new code.
export interface TrustUnit {
  id:        TrustUnitId;
  kind:      TrustUnitKind;
  memberIds: AIHUserId[];
  status:    "active" | "dissolved";
  createdAt: string;  // ISO 8601
  dissolvedAt: string | null;
}

// ─── Trust Unit Membership ─────────────────────────────────────────────────────

export interface TrustUnitMembership {
  id:          MembershipId;
  trustUnitId: TrustUnitId;
  userId:      AIHUserId;
  role:        TrustUnitRole;
  joinedAt:    string;       // ISO 8601
  exitedAt:    string | null;
}

// ─── Trust Unit Request (pending formation) ────────────────────────────────────

export interface AIHTrustUnitRequest {
  id:              string;
  createdById:     UserId;
  status:          "pending" | "active" | "declined";
  memberIds:       UserId[];
  pendingInviteIds:InviteId[];
  createdAt:       string;  // ISO 8601
}

// ─── Relationship Edge ─────────────────────────────────────────────────────────

export const RelationshipEdgeKind = {
  // Family tree edges (set at invite/registration time via User.invitedById)
  INVITED_BY:         "invited_by",         // A was invited by B
  PARENT_CHILD:       "parent_child",        // formal parent↔child from guardian model
  SIBLING:            "sibling",             // same parent(s) in the graph
  SPOUSE:             "spouse",              // partner/spouse link

  // Trust graph edges
  TRUST_UNIT_MEMBER:  "trust_unit_member",   // A and B share a TrustUnit
  GUARDIAN_OF:        "guardian_of",         // A is a guardian of B
  CHILD_OF:           "child_of",            // A is the child of B (inverse of GUARDIAN_OF)

  // Extended / soft edges
  CONNECTION:         "connection",          // accepted ConnectionRequest (soft link)
} as const;
export type RelationshipEdgeKind = (typeof RelationshipEdgeKind)[keyof typeof RelationshipEdgeKind];

export interface RelationshipEdge {
  fromUserId:    AIHUserId;
  toUserId:      AIHUserId;
  kind:          RelationshipEdgeKind;
  approvalState: ApprovalState;
  establishedAt: string;       // ISO 8601
  revokedAt:     string | null;
}

// ─── Graph Query Results ───────────────────────────────────────────────────────

// Adjacency result — used by trust graph service.
export interface TrustAdjacencyResult {
  areAdjacent:   boolean;
  sharedUnitIds: TrustUnitId[];
}

// Input shape for assertGraphShape — validates that a raw object is a plausible graph node.
export interface GraphShapeInput {
  userId:    string;
  edges?:    unknown[];
  unitIds?:  string[];
}
