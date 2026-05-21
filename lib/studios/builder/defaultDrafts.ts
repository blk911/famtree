import type { StudioDraftContentDTO, StudioTemplateType } from "@/types/studios/builder";
import { getStudioBuilderTemplate } from "@/lib/studios/builder/templates";

function section(title: string, body: string, bullets?: string[]) {
  return {
    title,
    body,
    bullets,
    visible: true,
    approved: false,
  };
}

/**
 * Template-filled draft JSON for a new builder session (no AI).
 */
export function buildDefaultDraftContent(
  templateType: StudioTemplateType,
  stewardName = "Your community",
): StudioDraftContentDTO {
  const meta = getStudioBuilderTemplate(templateType);
  const lens = meta?.triadLensId ?? "studio-network";

  const benefitsTitle =
    templateType === "gap-u-learning-lab"
      ? "Why this learning space"
      : "Why Studios";

  const howTitle =
    templateType === "gap-u-learning-lab"
      ? "How learning spaces work"
      : "How Studios works";

  return {
    version: 1,
    identity: {
      name: stewardName,
      tone: meta?.audience.includes("Executive") ? "concise" : "warm",
      audience: meta?.audience ?? "Your community",
      tagline: meta?.description,
    },
    hero: {
      eyebrow: meta?.title,
      headline: meta?.title ?? "Your private studio",
      subcopy: [meta?.description ?? "A trusted private space for your people."],
      triadLensId: lens,
    },
    cards: { cards: [] },
    benefits: section(
      benefitsTitle,
      "Private updates, governed membership, and messaging through AIH Spaces — not a parallel social feed.",
    ),
    howItWorks: section(
      howTitle,
      "Choose your studio type, add public links, review your draft, then publish when you are ready.",
      ["Invite members through AIH", "Message in Msg Vault", "Control visibility with Msg Rules"],
    ),
    servicesPrograms: [],
    location: {
      mapVisible: templateType !== "executive-work",
      confirmed: false,
    },
    media: {},
    inviteCopy: {
      inviteMessage: `You are invited to join ${stewardName} on AIH Studios.`,
      emailSubjectSuggestion: `Join ${stewardName}`,
    },
    firstPosts: [
      {
        id: "welcome-1",
        body: `Welcome to ${stewardName}. This is your private space for updates and coordination.`,
        audience: "members",
        approved: false,
      },
    ],
    requestAccessCopy: {
      headline: "Request access",
      body: "Ask the steward to approve your membership. Access is governed through AIH invite rules.",
      ctaLabel: "Request access",
    },
    confidenceWarnings: [],
    approvals: {
      sections: {},
      globalApproved: false,
      contactConfirmed: false,
      locationConfirmed: false,
      claimsConfirmed: false,
    },
  };
}
