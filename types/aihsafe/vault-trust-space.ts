/**
 * Client/DTO-oriented view of a governed Msg Vault trust space (trust unit).
 * Aligns with persisted trust unit + AIH meta; `spaceId` is the trust unit id.
 */
export type VaultTrustSpace = {
  spaceId: string;
  spaceType: string;
  name: string;
  description: string | null;
  createdById: string;
  memberIds: string[];
};
