import { prisma } from "@/lib/db/prisma";
import { getProviderBySlug } from "@/lib/studios/mockStudios";

export type ResolvedVoice = {
  greetingStyle: string;
  tone: string;
  businessType: string;
  escalationPhrase: string;
  communicationStyle: string;
  offersSummary: string | null;
  studioDisplayName: string | null;
};

export async function resolveVoiceForStudioSlug(slug: string): Promise<ResolvedVoice> {
  const row = await prisma.studio.findUnique({
    where: { slug },
    include: { voiceProfile: true },
  });

  const mock = getProviderBySlug(slug);
  const displayName = mock?.displayName ?? row?.name ?? "this studio";

  if (row?.voiceProfile) {
    const v = row.voiceProfile;
    return {
      greetingStyle: v.greetingStyle,
      tone: v.tone,
      businessType: v.businessType,
      escalationPhrase: v.escalationPhrase,
      communicationStyle: v.communicationStyle,
      offersSummary: v.offersSummary,
      studioDisplayName: displayName,
    };
  }

  return {
    greetingStyle:
      mock != null
        ? `Hey — welcome in. You're on ${displayName}'s page. What's pulling you here today?`
        : `Hey — thanks for visiting ${displayName}. What would feel helpful right now?`,
    tone: "warm_curator",
    businessType: String(mock?.category ?? "professional_services"),
    escalationPhrase:
      "Oh! My next client just walked in — drop your number and I'll text you the moment I'm free.",
    communicationStyle: "concierge",
    offersSummary: mock?.bio ?? row?.tagline ?? null,
    studioDisplayName: displayName,
  };
}

export function platformConciergeVoice(): ResolvedVoice {
  return {
    greetingStyle:
      "Hey — I'm the Studios concierge. Whether you're curious, comparing providers, or building your own studio, we'll keep this human and unrushed. What's on your mind?",
    tone: "premium_concierge",
    businessType: "platform",
    escalationPhrase:
      "I'd love to connect you with someone on our side directly — drop your email or IG handle and I'll make sure the right human follows up.",
    communicationStyle: "concierge",
    offersSummary:
      "AIH Studios: invite-aware profiles, trusted referrals, selective client access — relationship-first infrastructure for trainers and studios.",
    studioDisplayName: null,
  };
}
