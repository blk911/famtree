// AIH Safe — Graph Service
// Read-only queries over the family trust network.
// Never writes. Never enforces permissions — that is the governance kernel's job.
// Returns typed AIH Safe DTOs; all Prisma-to-AIH mapping is in lib/aihsafe/mappers/.

import { prisma } from "@/lib/db/prisma";
import type { AIHUserId, TrustUnitId } from "@/types/aihsafe/ids";
import type {
  TrustUnit,
  TrustUnitMembership,
  RelationshipEdge,
  GraphShapeInput,
} from "@/types/aihsafe/trust-units";
import type { GuardianRelationship } from "@/types/aihsafe/guardian";
import {
  mapTrustUnit,
  mapTrustUnitMembership,
  mapGuardianRelationship,
  mapConnectionRequestToEdge,
} from "@/lib/aihsafe/mappers";
import { isHumanTrustEligible } from "@/lib/trust/isHumanTrustEligible";

// ─── Trust Unit Queries ────────────────────────────────────────────────────────

/** Retrieve a single TrustUnit by its ID. Returns null if not found. */
export async function getTrustUnitById(
  id: TrustUnitId
): Promise<TrustUnit | null> {
  const row = await prisma.trustUnit.findUnique({
    where:   { id: id as string },
    include: { members: true, aihMeta: true },
  });
  if (!row) return null;
  return mapTrustUnit(row);
}

/** List all TrustUnits the given user is a current member of. */
export async function listTrustUnitsForUser(
  userId: AIHUserId
): Promise<TrustUnit[]> {
  const rows = await prisma.trustUnit.findMany({
    where: {
      status: "ACTIVE",
      members: { some: { userId: userId as string } },
    },
    include: { members: true, aihMeta: true },
  });
  return rows.map(mapTrustUnit);
}

// ─── Membership Queries ────────────────────────────────────────────────────────

/** List all TrustUnit memberships for a given user (across all their units). */
export async function listMembershipsForUser(
  userId: AIHUserId
): Promise<TrustUnitMembership[]> {
  const rows = await prisma.trustUnitMember.findMany({
    where: {
      userId: userId as string,
      trustUnit: { status: "ACTIVE" },
    },
  });
  return rows.map(mapTrustUnitMembership);
}

/** List all memberships within a specific TrustUnit. */
export async function listMembersForTrustUnit(
  trustUnitId: TrustUnitId
): Promise<TrustUnitMembership[]> {
  const rows = await prisma.trustUnitMember.findMany({
    where: { trustUnitId: trustUnitId as string },
  });
  return rows.map(mapTrustUnitMembership);
}

// ─── Guardian Relationship Queries ────────────────────────────────────────────

/** List all GuardianRelationships where the given user is the child. */
export async function getGuardianRelationshipsForChild(
  childUserId: AIHUserId
): Promise<GuardianRelationship[]> {
  const rows = await prisma.aihGuardianRelationship.findMany({
    where: { childUserId: childUserId as string },
  });
  return rows.map(mapGuardianRelationship);
}

/** List all GuardianRelationships where the given user is the guardian. */
export async function getGuardianRelationshipsForGuardian(
  guardianUserId: AIHUserId
): Promise<GuardianRelationship[]> {
  const rows = await prisma.aihGuardianRelationship.findMany({
    where: { guardianUserId: guardianUserId as string },
  });
  return rows.map(mapGuardianRelationship);
}

// ─── Graph Traversal ──────────────────────────────────────────────────────────

/**
 * List all RelationshipEdges (in and out) for a given user.
 * Phase 3: sourced from ConnectionRequest (the existing proxy table).
 * Phase 4+: replace with dedicated aih_relationship_edges table.
 */
export async function listRelationshipEdgesForUser(
  userId: AIHUserId
): Promise<RelationshipEdge[]> {
  const rows = await prisma.connectionRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId as string },
        { targetId:    userId as string },
      ],
    },
  });

  const touched = new Set<string>();
  for (const r of rows) {
    touched.add(r.requesterId);
    touched.add(r.targetId);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(touched) } },
    select: { id: true, role: true, email: true },
  });
  const elig = new Set(
    users.filter((u) => isHumanTrustEligible({ role: u.role, email: u.email })).map((u) => u.id),
  );

  const filtered = rows.filter(
    (r) => elig.has(r.requesterId) && elig.has(r.targetId),
  );
  return filtered.map(mapConnectionRequestToEdge);
}

// ─── Graph Shape Assertion ────────────────────────────────────────────────────

/**
 * Type assertion guard — validates that a raw unknown value conforms to GraphShapeInput.
 * Use at API boundaries before passing data into graph traversal functions.
 * Throws a TypeError with a descriptive message if the shape is invalid.
 */
export function assertGraphShape(
  input: unknown
): asserts input is GraphShapeInput {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof (input as Record<string, unknown>)["userId"] !== "string"
  ) {
    throw new TypeError(
      `assertGraphShape: expected { userId: string, edges?: unknown[], unitIds?: string[] }, got ${JSON.stringify(input)}`
    );
  }
}
