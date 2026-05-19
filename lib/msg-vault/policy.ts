import { resolvePolicyProfile } from "@/lib/aihsafe/policy/resolvePolicyProfile";
import { AgeTier, isMinorTier } from "@/types/aihsafe/age-tiers";
import type { ActorContext } from "@/types/aihsafe/governance";
import { validationError } from "@/lib/msg-vault/errors";

const URL_PATTERN = /\bhttps?:\/\/|www\./i;

export function bodyContainsExternalLink(text: string): boolean {
  return URL_PATTERN.test(text);
}

/**
 * Pre-send policy checks for governed messages.
 * Uses posting policy as messaging proxy until MessagingPolicy exists.
 */
export async function assertCanSendMessage(
  actor: ActorContext,
  bodyText: string,
): Promise<void> {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    throw validationError("Message cannot be empty.");
  }

  const policy = await resolvePolicyProfile(actor.actorUserId as string);

  if (isMinorTier(actor.ageTier) && !policy.posting.allowed) {
    throw validationError(
      "Messaging is currently disabled for your account. Ask your guardian if you have questions.",
    );
  }

  const hasLink = bodyContainsExternalLink(trimmed);

  if (hasLink && actor.ageTier === AgeTier.UNKNOWN) {
    throw validationError(
      "Add your date of birth to your profile before sharing links in messages.",
    );
  }
  if (hasLink && isMinorTier(actor.ageTier)) {
    const founderAllowsLinks = await loadMinorExternalLinksAllowed();
    if (!founderAllowsLinks) {
      throw validationError(
        "External links are not allowed in your messages on this network.",
      );
    }
  }
}

async function loadMinorExternalLinksAllowed(): Promise<boolean> {
  const { prisma } = await import("@/lib/db/prisma");
  const row = await prisma.aihFounderSettings.findFirst({
    select: { allowMinorExternalLinks: true },
  });
  return row?.allowMinorExternalLinks ?? false;
}
