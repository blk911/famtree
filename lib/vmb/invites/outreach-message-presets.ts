import type { InviteDraftCategory } from "@/types/vmb/invite-draft";
import {
  buildRelationshipFirstOutreachMessage,
  buildRelationshipFirstOutreachSubject,
  getRelationshipFirstCardForOutreachCategory,
  RELATIONSHIP_FIRST_INVITE_CARDS,
  VMB_INVITE_PRESET_SOURCE_MODULES,
} from "@/lib/vmb/cards/relationship-first-invite-copy";

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
  updatedAt?: string;
};

export { VMB_INVITE_PRESET_SOURCE_MODULES, RELATIONSHIP_FIRST_INVITE_CARDS };

export const OUTREACH_LOCKED_FOOTER_TEMPLATE =
  "\n\nSent from VMB on behalf of {salonName}\nPrivate client network · Reply links coming soon.";

export const OUTREACH_LOCKED_FOOTER_OPT_OUT_TEMPLATE =
  "\n\n— {salonName}\nPrivate client network · Reply STOP to opt out.";

function outreachPresetFromCard(category: InviteDraftCategory): OutreachMessagePreset {
  const card = getRelationshipFirstCardForOutreachCategory(category);
  if (!card) {
    throw new Error(`Missing relationship-first outreach card for ${category}`);
  }

  return {
    id: category,
    label: card.label,
    description: `${card.label} — relationship-first salon owner voice.`,
    subjectTemplate: `{subjectLine}`,
    messageTemplate: `{editableBody}`,
    lockedFooterTemplate: OUTREACH_LOCKED_FOOTER_TEMPLATE,
    primaryCtaLabel: card.primaryCta,
    channelHintSms: "Personal note with reply prompt",
    channelHintEmail: "Relationship-first invite with salon signature block",
  };
}

export const OUTREACH_MESSAGE_PRESETS: OutreachMessagePreset[] = [
  outreachPresetFromCard("private_client_network"),
  outreachPresetFromCard("new_client_welcome"),
  outreachPresetFromCard("revenue_touch"),
  outreachPresetFromCard("trusted_intro_request"),
];

const PRESET_BY_ID = new Map(OUTREACH_MESSAGE_PRESETS.map((preset) => [preset.id, preset]));

export function getOutreachMessagePreset(id: OutreachMessagePresetId): OutreachMessagePreset {
  return getDefaultOutreachPreset(id);
}

export function getDefaultOutreachPreset(id: OutreachMessagePresetId): OutreachMessagePreset {
  const preset = PRESET_BY_ID.get(id);
  if (!preset) {
    throw new Error(`Missing outreach message preset for ${id}`);
  }
  return { ...preset };
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
    subjectLine: "",
    editableBody: "",
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

export function buildOutreachDraftCopyFromPreset(
  preset: OutreachMessagePreset,
  vars: OutreachTemplateVars,
): { subject: string; editableMessage: string; lockedFooter: string; primaryCtaLabel: string } {
  const salonName = vars.salonName?.trim() || "Your Salon";
  const mergedVars = {
    ...vars,
    salonName,
    firstName: vars.firstName ?? firstNameFromClientName(vars.clientName),
  };
  const card = getRelationshipFirstCardForOutreachCategory(preset.id);
  if (!card) {
    throw new Error(`Missing relationship-first card for outreach preset ${preset.id}`);
  }

  const subject =
    preset.subjectTemplate && preset.subjectTemplate !== "{subjectLine}"
      ? renderOutreachTemplate(preset.subjectTemplate, mergedVars)
      : buildRelationshipFirstOutreachSubject(card, mergedVars);
  const editableMessage =
    preset.messageTemplate && preset.messageTemplate !== "{editableBody}"
      ? renderOutreachTemplate(preset.messageTemplate, mergedVars)
      : buildRelationshipFirstOutreachMessage(card, mergedVars);

  return {
    subject,
    editableMessage,
    lockedFooter: renderOutreachTemplate(preset.lockedFooterTemplate, mergedVars),
    primaryCtaLabel: preset.primaryCtaLabel,
  };
}

export function buildOutreachDraftCopy(
  category: InviteDraftCategory,
  vars: OutreachTemplateVars,
): { subject: string; editableMessage: string; lockedFooter: string; primaryCtaLabel: string } {
  return buildOutreachDraftCopyFromPreset(getDefaultOutreachPreset(category), vars);
}
