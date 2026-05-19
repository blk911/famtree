// Msg Vault — context rail view contracts (Agent 62). No Prisma imports.

import type { RelationshipContextDTO } from "./governance-overlay";

/** Trust unit summary attached to a governed thread conversation. */
export interface TrustUnitContextDTO {
  id: string;
  name: string | null;
  description: string | null;
  vaultSpaceType: string | null;
  defaultVisibilityScope: string | null;
}

/** Extra fields on GET /api/msg-vault/conversations/[id] for the right rail. */
export interface ConversationContextDetailDTO {
  relationshipContext: RelationshipContextDTO;
  trustUnit: TrustUnitContextDTO | null;
  /** Network-wide founder flag for private thread creation. */
  privateThreadsEnabled: boolean;
}
