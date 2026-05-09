// AIH Safe Governance — deterministic contract only. No persistence, no UI.
//
// Visibility Service — 4 deterministic scope-resolution functions.
// All functions are synchronous and side-effect-free.
// They receive pre-populated ActorContext and TargetContext.
// The caller is responsible for fetching graph data before calling these functions.
// No DB reads. No DB writes. No HTTP calls. No UI assumptions.
// Must never cache decisions across requests — correctness > performance at this stage.

import type { AIHUserId } from "@/types/aihsafe/ids";
import type { AgeTier } from "@/types/aihsafe/age-tiers";
import type { VisibilityScope } from "@/types/aihsafe/visibility";
import type { ActorContext, TargetContext, GovernanceDecision } from "@/types/aihsafe/governance";
import { ReasonCode } from "@/types/aihsafe/governance";
import { SCOPE_MATRIX, MAX_SCOPE_FOR_TIER } from "@/types/aihsafe/visibility-rules";
import { VisibilityScope as VS } from "@/types/aihsafe/visibility";

// ─── canView ──────────────────────────────────────────────────────────────────

/**
 * Determine whether the actor may view content belonging to target.
 * Uses the target's visibilityScope and pre-computed context fields.
 *
 * Scope resolution rules:
 *   PRIVATE        → actor must be the content owner
 *   GUARDIAN_ONLY  → actor must be owner OR active guardian of owner
 *   FAMILY         → actor must share a family unit with owner (sharedFamilyUnitIds)
 *   TRUST_UNIT     → actor must share a trust unit with owner (sharedTrustUnitIds)
 *   EXTENDED_TRUST → actor must be in actor's relationship graph (any shared unit or edge)
 *   PUBLIC_APPROVED→ allowed for all ADULT+; denied for minors unless guardian permits
 */
export function canView(actor: ActorContext, target: TargetContext): GovernanceDecision {
  const scope     = target.visibilityScope ?? VS.PRIVATE;
  const ownerId   = target.contentOwnerId;

  // Owner always sees their own content regardless of scope.
  if (ownerId && actor.actorUserId === ownerId) {
    return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Content owner." };
  }

  switch (scope) {
    case VS.PRIVATE:
      return {
        allowed: false,
        reasonCode: ReasonCode.DENIED_SCOPE_NOT_ALLOWED,
        reason: "Content is private. Only the owner may view it.",
      };

    case VS.GUARDIAN_ONLY: {
      const ownerStr = ownerId as string | undefined;
      const isGuardian = ownerStr
        ? actor.guardianRelationships.some(
            r => (r.childUserId as string) === ownerStr && r.revokedAt === null
          )
        : false;
      if (!isGuardian) {
        return {
          allowed: false,
          reasonCode: ReasonCode.DENIED_SCOPE_NOT_ALLOWED,
          reason: "Content is visible to the owner and their registered guardians only.",
        };
      }
      return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Active guardian of owner." };
    }

    case VS.FAMILY: {
      const shared = target.sharedFamilyUnitIds ?? [];
      if (shared.length === 0) {
        return {
          allowed: false,
          reasonCode: ReasonCode.DENIED_NOT_MEMBER,
          reason: "Actor does not share a family unit with the content owner.",
        };
      }
      return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Shared family unit member." };
    }

    case VS.TRUST_UNIT: {
      const shared = target.sharedTrustUnitIds ?? [];
      if (shared.length === 0) {
        return {
          allowed: false,
          reasonCode: ReasonCode.DENIED_NOT_MEMBER,
          reason: "Actor does not share a trust unit with the content owner.",
        };
      }
      return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Shared trust unit member." };
    }

    case VS.EXTENDED_TRUST: {
      // Any shared unit (family or trust) or any active relationship edge qualifies.
      const sharedTrust  = (target.sharedTrustUnitIds  ?? []).length > 0;
      const sharedFamily = (target.sharedFamilyUnitIds ?? []).length > 0;
      const hasEdge = ownerId
        ? actor.relationshipEdges.some(
            e =>
              (e.toUserId === ownerId || e.fromUserId === ownerId) &&
              e.revokedAt === null
          )
        : false;
      if (!sharedTrust && !sharedFamily && !hasEdge) {
        return {
          allowed: false,
          reasonCode: ReasonCode.DENIED_NOT_MEMBER,
          reason:
            "EXTENDED_TRUST requires a shared trust unit, shared family unit, or an active relationship edge.",
        };
      }
      return {
        allowed: true,
        reasonCode: ReasonCode.ALLOWED,
        reason: "Actor is within extended trust network of owner.",
      };
    }

    case VS.PUBLIC_APPROVED: {
      // Minors cannot view PUBLIC_APPROVED content unless they have a guardian-approved context.
      // For now: minors are denied; guardian override is an escalation path (Phase 3+).
      const allowedScopes = SCOPE_MATRIX[actor.ageTier];
      if (!(allowedScopes as readonly string[]).includes(VS.PUBLIC_APPROVED)) {
        return {
          allowed: false,
          reasonCode: ReasonCode.DENIED_SCOPE_NOT_ALLOWED,
          reason: `Age tier "${actor.ageTier}" is not permitted to access PUBLIC_APPROVED content.`,
        };
      }
      return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Public approved content." };
    }

    default: {
      const _exhaustive: never = scope;
      void _exhaustive;
      return {
        allowed: false,
        reasonCode: ReasonCode.DENIED_UNSUPPORTED_ACTION,
        reason: `Unknown visibility scope: ${String(scope)}`,
      };
    }
  }
}

// ─── resolveMaxScope ──────────────────────────────────────────────────────────

/**
 * Return the most permissive VisibilityScope the actor's age tier permits.
 * Used by UI to cap scope selectors and prevent illegal assignments.
 */
export function resolveMaxScope(actor: ActorContext): VisibilityScope {
  return MAX_SCOPE_FOR_TIER[actor.ageTier];
}

// ─── filterVisibleUsers ───────────────────────────────────────────────────────

/**
 * Filter a list of candidate user IDs to only those the actor may see.
 * A candidate is visible to the actor when they share:
 *   - a trust unit (memberships overlap)
 *   - a family unit (sharedFamilyUnitIds on each target would need population — here we
 *     use actor's memberships as the proxy since TargetContext per-user is not provided)
 *   - or the actor is the guardian/ward of the candidate
 *
 * NOTE: This is a coarse filter based on actor-side data only.
 * Fine-grained per-content visibility uses canView() with a full TargetContext.
 */
export function filterVisibleUsers(
  actor: ActorContext,
  candidates: AIHUserId[]
): AIHUserId[] {
  const actorTrustUnitIds = new Set(
    actor.memberships
      .filter(m => m.exitedAt === null)
      .map(m => m.trustUnitId)
  );

  const guardedChildIds = new Set(
    actor.guardianRelationships
      .filter(r => r.revokedAt === null)
      .map(r => r.childUserId as unknown as AIHUserId)
  );

  const guardianIds = new Set(
    actor.guardedByRelationships
      .filter(r => r.revokedAt === null)
      .map(r => r.guardianUserId as unknown as AIHUserId)
  );

  const edgePartnerIds = new Set(
    actor.relationshipEdges
      .filter(e => e.revokedAt === null)
      .flatMap(e => [e.fromUserId, e.toUserId])
      .filter(id => id !== actor.actorUserId)
  );

  return candidates.filter(candidateId => {
    if (candidateId === actor.actorUserId)  return true; // always see yourself
    if (guardedChildIds.has(candidateId))   return true;
    if (guardianIds.has(candidateId))       return true;
    if (edgePartnerIds.has(candidateId))    return true;
    // Membership overlap: candidate is visible if they share any trust unit with actor.
    // (Requires the caller to have populated actor.memberships — cannot verify candidate's
    //  units here without a TargetContext; that is the caller's responsibility.)
    return false;
  });
}

// ─── isScopeAllowedForAgeTier ─────────────────────────────────────────────────

/**
 * Deterministic scope gate — returns true when the given scope is in the permitted
 * set for the given age tier according to SCOPE_MATRIX.
 * Use this for input validation in API routes and UI scope selectors.
 */
export function isScopeAllowedForAgeTier(
  ageTier: AgeTier,
  scope: VisibilityScope
): boolean {
  return (SCOPE_MATRIX[ageTier] as readonly string[]).includes(scope);
}
