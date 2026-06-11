import crypto from "crypto";
import type { InviteDraftCategory } from "@/types/vmb/invite-draft";

/** Stable draft id — trial + analysis + client + category (no duplicates on refresh). */
export function stableInviteDraftId(
  trialId: string,
  analysisId: string,
  clientName: string,
  inviteCategory: InviteDraftCategory,
): string {
  const key = [
    trialId.trim(),
    analysisId.trim(),
    clientName.trim().toLowerCase(),
    inviteCategory,
  ].join("|");
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 20);
  return `invite-${hash}`;
}
