// Msg Vault — explainability contracts (Agent 49). No Prisma imports.

import type { VisibilityScope } from "@/types/aihsafe/visibility";
import type { PolicySourceType } from "@/types/aihsafe/policy";

/** Why the viewer can see or participate in a conversation. */
export interface GovernanceOverlayDTO {
  visibilityReason: string;
  reasonCode?: string;
  policySourceType?: PolicySourceType;
  visibilityScope?: VisibilityScope | string;
  guardianOversightActive: boolean;
  externalSharingAllowed: boolean;
  escalationPending: boolean;
}

/** Relationship edges that ground a conversation in the trust graph. */
export interface RelationshipContextDTO {
  viewerUserId: string;
  conversationId: string;
  /** Human-readable edges, e.g. "Shared trust unit: Soccer Crew". */
  edges: RelationshipEdgeDTO[];
  sharedTrustUnitIds: string[];
  guardianUserIds: string[];
  guardedChildUserIds: string[];
}

export interface RelationshipEdgeDTO {
  kind:
    | "trust_unit"
    | "guardian"
    | "guarded_by"
    | "relationship_edge"
    | "invited_by"
    | "space_member";
  label: string;
  relatedUserId?: string;
  trustUnitId?: string;
}
