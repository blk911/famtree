// AIH Safe Governance — deterministic contract only. No persistence, no UI.
//
// Governance Kernel — 10 deterministic action-gate functions.
// All functions are synchronous and side-effect-free.
// They receive pre-populated ActorContext and TargetContext from the caller.
// The caller (API route) is responsible for fetching graph data and building contexts.
// No DB reads. No DB writes. No HTTP calls. No UI assumptions.

import type { AIHUserId, TrustUnitId } from "@/types/aihsafe/ids";
import type { ActorContext, TargetContext, GovernanceDecision, CreateTrustUnitInput } from "@/types/aihsafe/governance";
import type { GuardianRelationship } from "@/types/aihsafe/guardian";
import { ReasonCode } from "@/types/aihsafe/governance";
import { AgeTier, AGE_TIER_BOUNDARIES, isMinorTier, MINOR_TIERS } from "@/types/aihsafe/age-tiers";
import { FamilySafeRole, TrustUnitRole } from "@/types/aihsafe/roles";
import { VisibilityScope, MINOR_ALLOWED_SCOPES, TEEN_ALLOWED_SCOPES } from "@/types/aihsafe/visibility";
import { GuardianPermissionLevel } from "@/types/aihsafe/guardian";
import { AuditEventKind } from "@/types/aihsafe/audit-events";

// ─── Internal decision helpers ────────────────────────────────────────────────
// Not exported — internal policy primitives only.

function allow(auditEventType?: AuditEventKind): GovernanceDecision {
  return { allowed: true, reasonCode: ReasonCode.ALLOWED, reason: "Allowed", auditEventType };
}

function deny(
  reasonCode: ReasonCode,
  reason: string,
  auditEventType?: AuditEventKind
): GovernanceDecision {
  return { allowed: false, reasonCode, reason, requiredApproval: false, auditEventType };
}

function escalate(
  reasonCode: ReasonCode,
  reason: string,
  auditEventType?: AuditEventKind
): GovernanceDecision {
  return { allowed: false, reasonCode, reason, requiredApproval: true, auditEventType };
}

// ─── Internal policy predicates ───────────────────────────────────────────────

function isMinor(actor: ActorContext): boolean {
  return isMinorTier(actor.ageTier);
}

function activeGuardianshipsOver(actor: ActorContext, targetUserId: AIHUserId): GuardianRelationship[] {
  const target = targetUserId as string;
  return actor.guardianRelationships.filter(
    r => (r.childUserId as string) === target && r.revokedAt === null
  );
}

function isGuardianOf(actor: ActorContext, targetUserId: AIHUserId): boolean {
  return activeGuardianshipsOver(actor, targetUserId).length > 0;
}

function guardianPermissionFor(
  actor: ActorContext,
  targetUserId: AIHUserId
): GuardianPermissionLevel | null {
  return activeGuardianshipsOver(actor, targetUserId)[0]?.permissionLevel ?? null;
}

// True if the actor is guarded by someone with APPROVER or FULL_CONTROL authority.
function actorHasGuardianApprover(actor: ActorContext): boolean {
  return actor.guardedByRelationships.some(
    r =>
      r.revokedAt === null &&
      (r.permissionLevel === GuardianPermissionLevel.APPROVER ||
        r.permissionLevel === GuardianPermissionLevel.FULL_CONTROL)
  );
}

function isMemberOf(actor: ActorContext, trustUnitId: TrustUnitId): boolean {
  return actor.memberships.some(
    m => m.trustUnitId === trustUnitId && m.exitedAt === null
  );
}

function hasUnitElevatedRole(actor: ActorContext, trustUnitId: TrustUnitId): boolean {
  return actor.memberships.some(
    m =>
      m.trustUnitId === trustUnitId &&
      m.exitedAt === null &&
      (m.role === TrustUnitRole.CREATOR || m.role === TrustUnitRole.MODERATOR)
  );
}

// True if the actor has any active relationship edge to/from targetUserId.
function hasEdgeTo(actor: ActorContext, targetUserId: AIHUserId): boolean {
  return actor.relationshipEdges.some(
    e =>
      (e.toUserId === targetUserId || e.fromUserId === targetUserId) &&
      e.revokedAt === null
  );
}

// Scope check — does actor's age tier permit using this scope?
function isScopePermittedFor(actor: ActorContext, scope: VisibilityScope): boolean {
  if (actor.ageTier === AgeTier.CHILD || actor.ageTier === AgeTier.PRETEEN) {
    return (MINOR_ALLOWED_SCOPES as readonly string[]).includes(scope);
  }
  if (actor.ageTier === AgeTier.TEEN) {
    return (TEEN_ALLOWED_SCOPES as readonly string[]).includes(scope);
  }
  return true; // ADULT, ELDER, UNKNOWN — all scopes permitted at this layer
}

// ─── Pure utility functions (exported) ────────────────────────────────────────

/**
 * Derive an AgeTier from a date of birth.
 * Returns AgeTier.UNKNOWN (deprecated) when dateOfBirth is null.
 * Never persisted — call on every request so the tier advances as users age.
 */
export function deriveAgeTier(dateOfBirth: Date | null): AgeTier {
  if (!dateOfBirth) return AgeTier.UNKNOWN;
  const today = new Date();
  const hadBirthdayThisYear =
    today >=
    new Date(today.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate());
  const age =
    today.getFullYear() - dateOfBirth.getFullYear() - (hadBirthdayThisYear ? 0 : 1);
  if (age <= AGE_TIER_BOUNDARIES.CHILD_MAX)   return AgeTier.CHILD;
  if (age <= AGE_TIER_BOUNDARIES.PRETEEN_MAX) return AgeTier.PRETEEN;
  if (age <= AGE_TIER_BOUNDARIES.TEEN_MAX)    return AgeTier.TEEN;
  if (age <= AGE_TIER_BOUNDARIES.ADULT_MAX)   return AgeTier.ADULT;
  return AgeTier.ELDER;
}

/**
 * Derive the FamilySafeRole for a user.
 * Minors (any age tier in MINOR_TIERS) → CHILD.
 * Adults with active guardianRelationships → GUARDIAN.
 * Adults without → ADULT.
 * Never persisted — derived at runtime.
 */
export function deriveFamilySafeRole(
  ageTier: AgeTier,
  guardianRelationships: GuardianRelationship[]
): FamilySafeRole {
  if (isMinorTier(ageTier)) return FamilySafeRole.CHILD;
  if (guardianRelationships.some(r => r.revokedAt === null)) return FamilySafeRole.GUARDIAN;
  return FamilySafeRole.ADULT;
}

// ─── Governance functions ─────────────────────────────────────────────────────
// Rule summary:
//   Adults → permitted for most actions.
//   Teens → permitted with guardian-approval escalation for sensitive actions.
//   Children/Preteens → hard deny OR escalate depending on action.
//   Every denial or escalation records an auditEventType for the caller to emit.

/**
 * Can the actor create a new TrustUnit?
 * Adults → allowed.
 * Teens → escalate to guardian approval.
 * Children/Preteens → hard deny (guardian must initiate on their behalf).
 */
export function canCreateTrustUnit(
  actor: ActorContext,
  input: CreateTrustUnitInput
): GovernanceDecision {
  void input; // kind may drive future sub-rules; captured for forward compat
  if (actor.ageTier === AgeTier.CHILD || actor.ageTier === AgeTier.PRETEEN) {
    return deny(
      ReasonCode.DENIED_MINOR_REQUIRES_GUARDIAN,
      "Children and preteens cannot create trust units; a guardian must do so on their behalf.",
      AuditEventKind.FAMILY_UNIT_CREATED
    );
  }
  if (actor.ageTier === AgeTier.TEEN) {
    if (!actorHasGuardianApprover(actor)) {
      return escalate(
        ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
        "Teens require an active guardian with approval authority to create trust units.",
        AuditEventKind.FAMILY_UNIT_CREATED
      );
    }
  }
  return allow(AuditEventKind.FAMILY_UNIT_CREATED);
}

/**
 * Can the actor invite a new user to a TrustUnit?
 * Minors cannot send invites.
 * Adults inviting a minor → escalate for guardian approval.
 * Adults inviting adults → allowed if actor is a member of the target unit.
 */
export function canInviteToTrustUnit(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (isMinor(actor)) {
    return deny(
      ReasonCode.DENIED_MINOR_REQUIRES_GUARDIAN,
      "Minors cannot send trust unit invites.",
      AuditEventKind.INVITE_SENT_CHILD
    );
  }
  if (target.trustUnitId && !isMemberOf(actor, target.trustUnitId)) {
    return deny(
      ReasonCode.DENIED_NOT_MEMBER,
      "Actor must be a member of the trust unit to invite others into it."
    );
  }
  if (target.targetAgeTier && isMinorTier(target.targetAgeTier)) {
    return escalate(
      ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
      "Inviting a minor requires approval from the minor's guardian.",
      AuditEventKind.INVITE_SENT_CHILD
    );
  }
  return allow(AuditEventKind.INVITE_SENT_CHILD);
}

/**
 * Can the actor join a TrustUnit?
 * Minors → escalate to guardian approval.
 * Adults → allowed when a target unit is specified.
 */
export function canJoinTrustUnit(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (!target.trustUnitId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No trust unit specified.");
  }
  if (isMinor(actor)) {
    return escalate(
      ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
      "Minors require guardian approval to join a trust unit.",
      AuditEventKind.TRUST_UNIT_MEMBER_ADDED
    );
  }
  return allow(AuditEventKind.TRUST_UNIT_MEMBER_ADDED);
}

/**
 * Can the actor approve an action on behalf of a child?
 * Actor must be an adult guardian of the target with APPROVER or FULL_CONTROL authority.
 */
export function canApproveChildAction(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (isMinor(actor)) {
    return deny(
      ReasonCode.DENIED_INSUFFICIENT_ROLE,
      "Minors cannot approve actions on behalf of another user."
    );
  }
  if (!target.targetUserId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No target user specified.");
  }
  if (!isGuardianOf(actor, target.targetUserId)) {
    return deny(
      ReasonCode.DENIED_NOT_GUARDIAN,
      "Actor does not have an active guardian relationship with the target user.",
      AuditEventKind.GUARDIAN_CONSENT_DENIED
    );
  }
  const perm = guardianPermissionFor(actor, target.targetUserId);
  if (perm === GuardianPermissionLevel.VIEW_ONLY) {
    return deny(
      ReasonCode.DENIED_INSUFFICIENT_ROLE,
      "Guardian has VIEW_ONLY authority. APPROVER or FULL_CONTROL is required to approve actions.",
      AuditEventKind.GUARDIAN_CONSENT_DENIED
    );
  }
  return allow(AuditEventKind.GUARDIAN_CONSENT_GIVEN);
}

/**
 * Can the actor create a child account?
 * Only adults may initiate child account creation.
 * The guardian relationship is established at creation time (enforced at API layer).
 */
export function canCreateChildAccount(
  actor: ActorContext,
  _target: TargetContext
): GovernanceDecision {
  if (isMinor(actor)) {
    return deny(
      ReasonCode.DENIED_MINOR_REQUIRES_GUARDIAN,
      "Minors cannot create child accounts. An adult guardian must initiate this.",
      AuditEventKind.CHILD_PROFILE_CREATED
    );
  }
  return allow(AuditEventKind.CHILD_PROFILE_CREATED);
}

/**
 * Can the actor manage membership in a TrustUnit (add/remove/suspend members)?
 * Requires CREATOR or MODERATOR role in the target unit.
 * Managing a minor's membership → escalate to guardian approval.
 */
export function canManageMembership(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (isMinor(actor)) {
    return deny(
      ReasonCode.DENIED_INSUFFICIENT_ROLE,
      "Minors cannot manage trust unit memberships."
    );
  }
  if (!target.trustUnitId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No trust unit specified.");
  }
  if (!hasUnitElevatedRole(actor, target.trustUnitId)) {
    return deny(
      ReasonCode.DENIED_INSUFFICIENT_ROLE,
      "Actor requires CREATOR or MODERATOR role in the trust unit to manage memberships."
    );
  }
  if (target.targetAgeTier && isMinorTier(target.targetAgeTier)) {
    return escalate(
      ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
      "Modifying a minor's membership requires approval from their guardian.",
      AuditEventKind.MEMBERSHIP_GRANTED
    );
  }
  return allow(AuditEventKind.MEMBERSHIP_GRANTED);
}

/**
 * Can the actor post content at the specified visibility scope?
 * Scope must be permitted for the actor's age tier.
 */
export function canPostContent(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  const scope = target.visibilityScope ?? VisibilityScope.PRIVATE;
  if (!isScopePermittedFor(actor, scope)) {
    return deny(
      ReasonCode.DENIED_SCOPE_NOT_ALLOWED,
      `Scope "${scope}" is not permitted for age tier "${actor.ageTier}". ` +
        `Minors may only post to: ${(MINOR_ALLOWED_SCOPES as readonly string[]).join(", ")}.`,
      AuditEventKind.VISIBILITY_CHANGED
    );
  }
  return allow();
}

/**
 * Can the actor comment on content?
 * Actor must be able to view the content scope, and for TRUST_UNIT scope
 * must be a member of the specified unit.
 */
export function canComment(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  const scope = target.visibilityScope ?? VisibilityScope.FAMILY;
  if (!isScopePermittedFor(actor, scope)) {
    return deny(
      ReasonCode.DENIED_SCOPE_NOT_ALLOWED,
      `Actor's age tier "${actor.ageTier}" cannot access content at scope "${scope}".`
    );
  }
  if (scope === VisibilityScope.TRUST_UNIT && target.trustUnitId) {
    if (!isMemberOf(actor, target.trustUnitId)) {
      return deny(
        ReasonCode.DENIED_NOT_MEMBER,
        "Actor is not a member of the trust unit that hosts this content."
      );
    }
  }
  return allow();
}

/**
 * Can the actor send a direct message to the target?
 * Requires at least one of: shared TrustUnit, guardian relationship, or relationship edge.
 * Minors may only message within guardian or trust unit context.
 */
export function canMessage(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (!target.targetUserId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No target user specified.");
  }
  const sharedUnits = target.sharedTrustUnitIds ?? [];
  const hasSharedUnit    = sharedUnits.length > 0;
  const isActorGuardian  = isGuardianOf(actor, target.targetUserId);
  const isActorGuarded   = actor.guardedByRelationships.some(
    r => r.guardianUserId === target.targetUserId && r.revokedAt === null
  );
  const hasEdge = hasEdgeTo(actor, target.targetUserId);

  if (!hasSharedUnit && !isActorGuardian && !isActorGuarded && !hasEdge) {
    return deny(
      ReasonCode.DENIED_NOT_MEMBER,
      "Actor and target share no trust unit, guardian relationship, or relationship edge. " +
        "A connection must exist before direct messaging is permitted."
    );
  }
  // Minors may only message within an established trust or guardian context.
  if (isMinor(actor) && !isActorGuardian && !isActorGuarded && !hasSharedUnit) {
    return deny(
      ReasonCode.DENIED_MINOR_REQUIRES_GUARDIAN,
      "Minors may only message users they share a trust unit with or have a guardian relationship with."
    );
  }
  return allow();
}

/**
 * Can the actor exit their own membership in a TrustUnit?
 * Unlike canManageMembership (which gates managing others), this gate covers self-exit only.
 * Last-member protection is enforced at the route layer (requires a DB count).
 */
export function canExitMembership(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (!target.trustUnitId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No trust unit specified.");
  }
  if (!isMemberOf(actor, target.trustUnitId)) {
    return deny(
      ReasonCode.DENIED_NOT_MEMBER,
      "Actor is not an active member of this trust unit."
    );
  }
  return allow(AuditEventKind.MEMBERSHIP_REVOKED);
}

/**
 * Can the actor expand their trust network to include the target?
 * Adults may freely expand; minors cannot initiate.
 * Expanding to include a minor → escalate to guardian approval.
 */
export function canExpandTrust(
  actor: ActorContext,
  target: TargetContext
): GovernanceDecision {
  if (isMinor(actor)) {
    return deny(
      ReasonCode.DENIED_MINOR_REQUIRES_GUARDIAN,
      "Minors cannot initiate trust expansion. A guardian must do so on their behalf.",
      AuditEventKind.TRUST_UNIT_MEMBER_ADDED
    );
  }
  if (!target.targetUserId) {
    return deny(ReasonCode.DENIED_TARGET_NOT_FOUND, "No target user specified.");
  }
  if (target.targetAgeTier && isMinorTier(target.targetAgeTier)) {
    return escalate(
      ReasonCode.REQUIRES_GUARDIAN_APPROVAL,
      "Adding a minor to your extended trust network requires approval from their guardian.",
      AuditEventKind.TRUST_UNIT_MEMBER_ADDED
    );
  }
  return allow(AuditEventKind.TRUST_UNIT_MEMBER_ADDED);
}
