// AIH Safe API Contract Architect — contracts only. No live routes or persistence.
//
// Request and resource DTO shapes for AIH Safe API routes.
// These are pure data contracts — no runtime logic, no Prisma imports, no app/* imports.
// Zod schemas that enforce these shapes are Agent 3's responsibility.

import type {
  AIHUserId,
  FamilyUnitId,
  TrustUnitId,
  MembershipId,
  InviteId,
  GuardianRelationshipId,
  AuditEventId,
} from "./ids";
import type { AgeTier } from "./age-tiers";
import type { TrustUnitKind } from "./trust-units";
import type { VisibilityScope } from "./visibility";
import type { ReasonCode } from "./governance";
import type { AuditEventKind } from "./audit-events";

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateFamilyUnitRequest {
  name:       string;               // 1–80 chars
  memberIds?: string[];             // pre-add members at creation time
}

export interface CreateTrustUnitRequest {
  kind:                    TrustUnitKind;
  name?:                   string;          // 1–80 chars
  memberIds?:              string[];
  defaultVisibilityScope?: VisibilityScope; // defaults to "trust_unit"
  maxMemberCount?:         number;          // 3–100, defaults to 3
}

export interface InviteMemberRequest {
  trustUnitId?:    string;         // TrustUnitId — at least one of trustUnitId/familyUnitId required
  familyUnitId?:   string;         // FamilyUnitId
  recipientEmail:  string;         // email format
  relationship:    "parent" | "child" | "sibling" | "spouse" | "so" | "frnd" | "other";
  targetAgeTier?:  AgeTier;        // caller hint — governs escalation path
}

export interface CreateGuardianLinkRequest {
  childUserId:      string;         // UserId
  kind:             "parent" | "grandparent" | "legal_guardian" | "trusted_adult";
  permissionLevel:  "view_only" | "approver" | "full_control";
}

export interface UpdateGuardianLinkRequest {
  permissionLevel: "view_only" | "approver" | "full_control";
}

export interface JoinTrustUnitRequest {
  trustUnitId: string;              // TrustUnitId
}

export interface ManageMembershipRequest {
  action: "exit" | "remove" | "promote" | "demote";
  role?:  "creator" | "member" | "moderator";
}

export interface ApproveRequestBody {
  note?: string;                    // 0–500 chars, shown to requestor
}

export interface DenyRequestBody {
  reason?: string;                  // 0–500 chars, shown to requestor
}

export interface PostContentRequest {
  trustUnitId?:     string;         // TrustUnitId
  familyUnitId?:    string;         // FamilyUnitId — at least one required
  visibilityScope:  VisibilityScope;
  body:             string;         // 1–5000 chars
  mediaUrls?:       string[];       // Phase 4 — pre-signed Blob URLs
}

export interface UpdateVisibilityScopeRequest {
  visibilityScope: VisibilityScope;
}

export interface CheckVisibilityRequest {
  contentOwnerId:   string;         // UserId
  visibilityScope:  VisibilityScope;
  trustUnitId?:     string;         // TrustUnitId
  familyUnitId?:    string;         // FamilyUnitId
}

export interface ExpandTrustRequest {
  targetUserId: string;             // UserId
  trustUnitId:  string;             // TrustUnitId
}

// ─── Resource DTOs ────────────────────────────────────────────────────────────

export interface FamilyUnitMemberDTO {
  id:          string;              // MembershipId
  userId:      string;              // UserId
  displayName: string;              // firstName + " " + lastName
  role:        "guardian" | "child" | "adult";
  joinedAt:    string;              // ISO 8601
  exitedAt:    string | null;
}

export interface FamilyUnitDTO {
  id:              string;          // FamilyUnitId
  name:            string;
  status:          "active" | "dissolved";
  createdByUserId: string;          // UserId
  createdAt:       string;          // ISO 8601
  dissolvedAt:     string | null;
  members:         FamilyUnitMemberDTO[];
}

export interface TrustUnitMemberDTO {
  id:          string;              // MembershipId
  userId:      string;              // UserId
  displayName: string;
  role:        "creator" | "member" | "moderator";
  joinedAt:    string;              // ISO 8601
  exitedAt:    string | null;
}

export interface TrustUnitDTO {
  id:                    string;    // TrustUnitId
  name?:                 string;    // optional display name — present once AihTrustUnitMeta.name column exists
  kind:                  TrustUnitKind;
  status:                "active" | "dissolved";
  defaultVisibilityScope: VisibilityScope;
  maxMemberCount:        number;
  createdAt:             string;    // ISO 8601
  dissolvedAt:           string | null;
  members:               TrustUnitMemberDTO[];
}

export interface GuardianLinkDTO {
  id:              string;          // GuardianRelationshipId
  guardianUserId:  string;          // UserId
  guardianName:    string;
  childUserId:     string;          // UserId
  childName:       string;
  kind:            "parent" | "grandparent" | "legal_guardian" | "trusted_adult";
  permissionLevel: "view_only" | "approver" | "full_control";
  establishedAt:   string;          // ISO 8601
  revokedAt:       string | null;
}

export interface InviteDTO {
  id:             string;           // InviteId
  recipientEmail: string;
  status:         string;           // AIHInviteState
  relationship:   string;
  trustUnitId:    string | null;
  familyUnitId:   string | null;
  expiresAt:      string;           // ISO 8601
  createdAt:      string;           // ISO 8601
}

export interface ApprovalRequestDTO {
  id:             string;           // cuid
  requestorId:    string;           // UserId
  requestorName:  string;
  approverId:     string;           // UserId
  actionKind:     string;           // AuditEventKind
  contextSummary: string;           // Human-readable description of the requested action
  state:          "pending" | "approved" | "denied" | "revoked" | "expired";
  expiresAt:      string;           // ISO 8601
  resolvedAt:     string | null;
  createdAt:      string;           // ISO 8601
}

export interface AuditEventDTO {
  id:        string;                // AuditEventId
  kind:      string;                // AuditEventKind
  actorId:   string;
  targetId:  string | null;
  meta:      Record<string, unknown>;
  createdAt: string;                // ISO 8601
}

// ─── Governance Decision DTO ─────────────────────────────────────────────────
// Surfaced in API responses alongside mutation results and in 403/202 responses.

export interface GovernanceDecisionDTO {
  allowed:            boolean;
  reasonCode:         ReasonCode;
  reason:             string;
  requiredApproval:   boolean;
  approvalRequestId?: string;       // present when requiredApproval = true and request was created
}

// ─── Activity layer ───────────────────────────────────────────────────────────

export interface ActivityPostDTO {
  id:              string;
  authorId:        string;
  authorName:      string;
  authorPhotoUrl:  string | null;
  trustUnitId:     string | null;
  trustUnitName:   string | null;
  familyUnitId:    string | null;
  visibilityScope: string;
  bodyText:        string;
  governanceState: string;
  escalationState: string;
  attachmentType:  string | null;
  createdAt:       string;
  commentCount:    number;
  visibilityReasons: string[];    // e.g. ["Apex Soccer", "approved trusted space"]
}

export interface ActivityCommentDTO {
  id:             string;
  postId:         string;
  authorId:       string;
  authorName:     string;
  authorPhotoUrl: string | null;
  body:           string;
  createdAt:      string;
}

export interface CreateActivityPostRequest {
  bodyText:        string;
  trustUnitId?:    string;
  familyUnitId?:   string;
  visibilityScope?: string;
  attachmentType?: string;
}

export interface CreateActivityCommentRequest {
  body: string;
}

// ─── Founder settings ────────────────────────────────────────────────────────

/** Full shape returned by GET /api/aihsafe/founder-settings. */
export interface FounderSettingsDTO {
  id:                              string;
  requireGuardianApprovalForMinors: boolean;
  allowMinorInvites:               boolean;
  allowMinorPosting:               boolean;
  allowMinorExternalLinks:         boolean;
  /** VisibilityScope value — default scope for adult member content. */
  defaultVisibilityScope:          string;
  enableTrustedAdults:             boolean;
  enablePrivateThreads:            boolean;
  updatedAt:                       string; // ISO 8601
}

/** Body for PATCH /api/aihsafe/founder-settings — all fields optional. */
export interface PatchFounderSettingsRequest {
  requireGuardianApprovalForMinors?: boolean;
  allowMinorInvites?:               boolean;
  allowMinorPosting?:               boolean;
  allowMinorExternalLinks?:         boolean;
  defaultVisibilityScope?:          string;
  enableTrustedAdults?:             boolean;
  enablePrivateThreads?:            boolean;
}

// ─── Pending Escalation ──────────────────────────────────────────────────────
// Carried in 202 responses alongside GovernanceDecisionDTO.

export interface PendingEscalationDTO {
  approvalRequestId: string;
  expiresAt:         string;        // ISO 8601
  actionKind:        string;        // AuditEventKind
}
