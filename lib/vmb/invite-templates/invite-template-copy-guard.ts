import { getDefaultNailInviteTemplate } from "./default-nail-invite-templates";
import type { VmbInviteTemplate } from "./invite-template-types";

/** Legacy relationship-first / card-template phrases that must not bleed into non-PCN invites. */
export const LEGACY_INVITE_COPY_MARKERS = [
  "I want to invite you into my Private Client Network",
  "It's the easiest way to stay connected",
  "referral reward",
  "Referral Thank You",
] as const;

const PCN_BODY_SNIPPET = "inviting a small group of clients into my private client network";

export function containsLegacyInviteCopy(text: string): boolean {
  const blob = text.toLowerCase();
  if (LEGACY_INVITE_COPY_MARKERS.some((marker) => text.includes(marker))) return true;
  if (blob.includes("relationship-first")) return true;
  return false;
}

export function inviteTemplateHasLegacyBleed(template: VmbInviteTemplate): boolean {
  if (template.inviteType === "private_client_network") return false;

  const copyBlob = [
    template.body,
    template.headline,
    template.ctaLabel,
    template.subject,
    template.eyebrow,
  ].join("\n");

  if (containsLegacyInviteCopy(copyBlob)) return true;
  if (copyBlob.toLowerCase().includes(PCN_BODY_SNIPPET)) return true;

  const pcnBaseline = getDefaultNailInviteTemplate("nails-private-client-network");
  if (pcnBaseline && template.body.trim() === pcnBaseline.body.trim()) return true;

  return false;
}

/** Restore nail-catalog copy when stored overrides still carry legacy shared card copy. */
export function sanitizeInviteTemplateAgainstLegacyBleed(
  template: VmbInviteTemplate,
): VmbInviteTemplate {
  const baseline = getDefaultNailInviteTemplate(template.id);
  if (!baseline) return template;
  if (template.inviteType !== baseline.inviteType) return { ...baseline };
  if (!inviteTemplateHasLegacyBleed(template)) return template;

  return {
    ...template,
    displayName: baseline.displayName,
    intent: baseline.intent,
    subject: baseline.subject,
    eyebrow: baseline.eyebrow,
    headline: baseline.headline,
    body: baseline.body,
    ctaLabel: baseline.ctaLabel,
    defaultOfferCategory: template.defaultOfferCategory ?? baseline.defaultOfferCategory,
    allowedOfferCategories: template.allowedOfferCategories.length
      ? template.allowedOfferCategories
      : [...baseline.allowedOfferCategories],
  };
}

export function cloneInviteTemplate(template: VmbInviteTemplate): VmbInviteTemplate {
  return {
    ...template,
    allowedOfferCategories: [...template.allowedOfferCategories],
  };
}
