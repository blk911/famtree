import { buildDefaultDraftContent } from "@/lib/studios/builder/defaultDrafts";
import { getStudioBuilderTemplate } from "@/lib/studios/builder/templates";
import type {
  StudioDraftContentDTO,
  StudioSourceInputDTO,
  StudioTemplateType,
} from "@/types/studios/builder";

export type GenerateDraftInput = {
  templateType: StudioTemplateType;
  sources: StudioSourceInputDTO[];
  stewardName?: string;
};

function pickName(sources: StudioSourceInputDTO[], fallback: string): string {
  for (const s of sources) {
    const n = s.extractedData?.displayName?.trim();
    if (n) return n;
  }
  return fallback;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "my-studio";
}

/**
 * Safe mock AI draft — template + sources only (no scraping, no paid API).
 */
export function generateStudioDraftContent(input: GenerateDraftInput): StudioDraftContentDTO {
  const meta = getStudioBuilderTemplate(input.templateType);
  const base = buildDefaultDraftContent(input.templateType, input.stewardName ?? "Your community");
  const name = pickName(input.sources, base.identity.name);
  const slugSuggestion = slugify(name);
  const sourceHints = input.sources
    .map((s) => s.label || s.url || s.sourceType)
    .filter(Boolean)
    .slice(0, 3);

  const isExecutive = input.templateType === "executive-work";
  const isLearning =
    input.templateType === "family-learning" || input.templateType === "gap-u-learning-lab";
  const isClient = input.templateType === "private-client-network";

  const warnings: StudioDraftContentDTO["confidenceWarnings"] = [];
  if (input.sources.length === 0) {
    warnings.push({
      field: "sources",
      severity: "medium",
      message: "No public source links — draft uses template defaults only.",
    });
  }
  if (sourceHints.some((h) => h.includes("instagram") || h.includes("facebook"))) {
    warnings.push({
      field: "socialProof",
      severity: "low",
      message: "Social links added — review any claims before publishing.",
    });
  }

  const heroHeadline = isExecutive
    ? `${name} — private strategy space`
    : isLearning
      ? `${name} — learning space`
      : `${name}`;

  const cards = [
    {
      id: "card-1",
      title: isClient ? "Private client updates" : "Your private network",
      subcopy: ["Members-only updates without public feed noise."],
      benefits: ["Invite-only access", "Steward-approved membership"],
    },
    {
      id: "card-2",
      title: isLearning ? "Parent & tutor coordination" : "Governed messaging",
      subcopy: ["Msg Vault threads scoped to your Space — not a parallel inbox."],
      benefits: ["Msg Rules active", "No anonymous DMs from the public page"],
    },
    {
      id: "card-3",
      title: "Published studio preview",
      subcopy: [meta?.description ?? "Branded public face of your governed Space."],
      benefits: ["Request access CTA", "Invite through AIH identity gate"],
    },
  ];

  const services =
    isClient && sourceHints.length
      ? sourceHints.map((hint, i) => ({
          id: `svc-${i}`,
          name: hint.replace(/^https?:\/\//, "").slice(0, 40),
          description: "From your public source link — confirm before publish.",
          visible: true,
          approved: false,
          sourceRef: input.sources[i]?.id,
        }))
      : base.servicesPrograms;

  return {
    ...base,
    version: base.version + 1,
    generatedBy: "ai_stub",
    generatedAt: new Date().toISOString(),
    aiDraftLabel: "AI draft — review before publish",
    identity: {
      ...base.identity,
      name,
      slugSuggestion,
      tagline: meta?.description,
      audience: meta?.audience,
    },
    hero: {
      ...base.hero,
      headline: heroHeadline,
      subcopy: [
        meta?.description ?? base.hero.subcopy[0] ?? "",
        sourceHints.length
          ? `Draft informed by ${sourceHints.length} public source link(s).`
          : "Review all copy before publishing.",
      ],
      triadLensId: meta?.triadLensId,
    },
    cards: { cards },
    benefits: {
      ...base.benefits,
      title: isLearning ? "Why this learning space" : base.benefits.title,
      body: isExecutive
        ? "A confidential Space for leadership — minimal public surface, invite-only membership."
        : base.benefits.body,
    },
    howItWorks: {
      ...base.howItWorks,
      body: "Request access → steward approval → AIH invite → member Space and Msg Vault.",
    },
    servicesPrograms: services,
    inviteCopy: {
      inviteMessage: `You're invited to join ${name} on AIH — a private, invite-only studio.`,
      emailSubjectSuggestion: `Join ${name} on AIH Studios`,
    },
    firstPosts: [
      {
        id: "welcome-1",
        body: `Welcome to ${name}. This space is invite-only — say hello when you're ready.`,
        audience: "members",
        approved: false,
      },
    ],
    requestAccessCopy: {
      headline: isLearning ? "Request access (guardian-aware)" : "Request access",
      body: isLearning
        ? "Parents and stewards approve membership. Child requests follow guardian rules."
        : "Tell the steward why you'd like to join. Access stays invite-only.",
      ctaLabel: "Request access",
    },
    confidenceWarnings: warnings,
    approvals: {
      sections: {},
      globalApproved: false,
      contactConfirmed: false,
      locationConfirmed: false,
      claimsConfirmed: false,
    },
  };
}
