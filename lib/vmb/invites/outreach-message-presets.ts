import type { InviteDraftCategory } from "@/types/vmb/invite-draft";

export type OutreachMessagePresetId = InviteDraftCategory;

export type OutreachMessagePreset = {
  id: OutreachMessagePresetId;
  label: string;
  description: string;
  subjectTemplate: string;
  messageTemplate: string;
  /** Appended to operator-composed messages — not editable in send modal. */
  lockedFooterTemplate: string;
  primaryCtaLabel: string;
  channelHintSms: string;
  channelHintEmail: string;
};

export const OUTREACH_LOCKED_FOOTER_TEMPLATE =
  "\n\nSent from VMB on behalf of {salonName}\nPrivate client network · Reply links coming soon.";

export const OUTREACH_LOCKED_FOOTER_OPT_OUT_TEMPLATE =
  "\n\n— {salonName}\nPrivate client network · Reply STOP to opt out.";

export const OUTREACH_MESSAGE_PRESETS: OutreachMessagePreset[] = [
  {
    id: "private_client_network",
    label: "Private Client Network",
    description: "Default subject, body, and footer for PCN invite send/preview modals.",
    subjectTemplate: "You're invited to {salonName}'s private client network",
    messageTemplate: `Hi {firstName},

We've been building something special for our favorite clients — a private network where you get first access to openings, member-only offers, and a direct line to us (no algorithms, no noise).

We'd love to invite you in this week. Reply YES and we'll send your personal link.

Thank you for being part of {salonName}.`,
    lockedFooterTemplate: OUTREACH_LOCKED_FOOTER_TEMPLATE,
    primaryCtaLabel: "Join My Private Client Network",
    channelHintSms: "Short invite with reply YES prompt",
    channelHintEmail: "Full PCN invite with salon signature block",
  },
  {
    id: "new_client_welcome",
    label: "New Client Welcome",
    description: "Welcome outreach for newly imported clients.",
    subjectTemplate: "Welcome to {salonName}",
    messageTemplate: `{welcomeMessage}

We'd love to stay connected — reply if you'd like your private client link.`,
    lockedFooterTemplate: OUTREACH_LOCKED_FOOTER_TEMPLATE,
    primaryCtaLabel: "Welcome to the salon",
    channelHintSms: "Brief welcome note",
    channelHintEmail: "Welcome message with private link offer",
  },
  {
    id: "revenue_touch",
    label: "Revenue Touch",
    description: "Reactivation and revenue opportunity outreach.",
    subjectTemplate: "{suggestedAction} — {salonName}",
    messageTemplate: `Hi {firstName},

We noticed {reason} and wanted to reach out with a personal invite.

{suggestedAction} — reply if you'd like us to hold a spot for you.

— {salonName}`,
    lockedFooterTemplate: OUTREACH_LOCKED_FOOTER_TEMPLATE,
    primaryCtaLabel: "Book my next visit",
    channelHintSms: "Personal revenue touch with reply prompt",
    channelHintEmail: "Revenue opportunity with hold-a-spot CTA",
  },
  {
    id: "trusted_intro_request",
    label: "Trusted Intro Request",
    description: "Warm introduction ask for referral-ready clients.",
    subjectTemplate: "Quick intro request — {salonName}",
    messageTemplate: `Hi {firstName},

{promptText}

Reply if you're open to a warm introduction this week.`,
    lockedFooterTemplate: OUTREACH_LOCKED_FOOTER_TEMPLATE,
    primaryCtaLabel: "Make an introduction",
    channelHintSms: "Short intro request",
    channelHintEmail: "Trusted intro ask with reply prompt",
  },
];

const PRESET_BY_ID = new Map(OUTREACH_MESSAGE_PRESETS.map((preset) => [preset.id, preset]));

export function getOutreachMessagePreset(id: OutreachMessagePresetId): OutreachMessagePreset {
  const preset = PRESET_BY_ID.get(id);
  if (!preset) {
    throw new Error(`Missing outreach message preset for ${id}`);
  }
  return preset;
}

export function listOutreachMessagePresets(): OutreachMessagePreset[] {
  return OUTREACH_MESSAGE_PRESETS.map((preset) => ({ ...preset }));
}

export type OutreachTemplateVars = {
  salonName?: string;
  clientName?: string;
  firstName?: string;
  welcomeMessage?: string;
  reason?: string;
  suggestedAction?: string;
  promptText?: string;
};

export function firstNameFromClientName(clientName?: string): string {
  const trimmed = clientName?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function renderOutreachTemplate(template: string, vars: OutreachTemplateVars): string {
  const salonName = vars.salonName?.trim() || "Your Salon";
  const firstName = vars.firstName?.trim() || firstNameFromClientName(vars.clientName);
  const replacements: Record<string, string> = {
    salonName,
    clientName: vars.clientName?.trim() || "friend",
    firstName,
    welcomeMessage: vars.welcomeMessage?.trim() || "",
    reason: vars.reason?.trim() || "it's been a while",
    suggestedAction: vars.suggestedAction?.trim() || "We have a spot that might work",
    promptText: vars.promptText?.trim() || "",
  };

  return template.replace(/\{(\w+)\}/g, (_, key: string) => replacements[key] ?? "");
}

export function buildOutreachLockedFooter(
  salonName: string,
  variant: "standard" | "opt_out" = "standard",
): string {
  const template =
    variant === "opt_out"
      ? OUTREACH_LOCKED_FOOTER_OPT_OUT_TEMPLATE
      : OUTREACH_LOCKED_FOOTER_TEMPLATE;
  return renderOutreachTemplate(template, { salonName });
}

export function buildOutreachDraftCopy(
  category: InviteDraftCategory,
  vars: OutreachTemplateVars,
): { subject: string; editableMessage: string; lockedFooter: string; primaryCtaLabel: string } {
  const preset = getOutreachMessagePreset(category);
  const salonName = vars.salonName?.trim() || "Your Salon";
  const mergedVars = {
    ...vars,
    salonName,
    firstName: vars.firstName ?? firstNameFromClientName(vars.clientName),
  };

  return {
    subject: renderOutreachTemplate(preset.subjectTemplate, mergedVars),
    editableMessage: renderOutreachTemplate(preset.messageTemplate, mergedVars).trim(),
    lockedFooter: renderOutreachTemplate(preset.lockedFooterTemplate, mergedVars),
    primaryCtaLabel: preset.primaryCtaLabel,
  };
}

/** Canonical preset source paths for admin/product wiring tests. */
export const VMB_INVITE_PRESET_SOURCE_MODULES = {
  outreachMessages: "lib/vmb/invites/outreach-message-presets.ts",
  cardTemplates: "lib/vmb/card-templates/default-card-templates.ts",
  ctaLabels: "lib/vmb/card-templates/template-cta-labels.ts",
  personalInviteCopy: "lib/vmb/cards/personal-invite-copy.ts",
  defaultOffers: "lib/vmb/offers/default-offers.ts",
  defaultServices: "lib/vmb/services/default-service-catalog.ts",
} as const;
