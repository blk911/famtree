import type { CSSProperties } from "react";
import { applyInviteTemplateTokens } from "./invite-template-tokens";
import type { InviteTemplateTokenContext, VmbInviteTemplate } from "./invite-template-types";

export type AdminNailInviteCardTemplate = Pick<
  VmbInviteTemplate,
  | "id"
  | "displayName"
  | "intent"
  | "subject"
  | "eyebrow"
  | "headline"
  | "body"
  | "ctaLabel"
  | "defaultOfferCategory"
  | "allowedOfferCategories"
>;

export type AdminNailInviteCardOffer = {
  name: string;
  description?: string;
  price?: string;
  serviceName?: string;
  addonLabels?: string[];
};

export type ResolvedAdminNailInviteCardContent = {
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
};

export function resolveAdminNailInviteCardContent(
  template: AdminNailInviteCardTemplate,
  tokenContext?: InviteTemplateTokenContext,
): ResolvedAdminNailInviteCardContent {
  const apply = (raw: string | undefined): string => {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) return "";
    return tokenContext ? applyInviteTemplateTokens(trimmed, tokenContext) : trimmed;
  };

  const bodyRaw = template.body?.trim() ?? "";
  const ctaRaw = template.ctaLabel?.trim() ?? "";

  return {
    eyebrow: apply(template.eyebrow),
    headline: apply(template.headline),
    body: bodyRaw
      ? apply(template.body)
      : `Template body missing for ${template.id}`,
    ctaLabel: ctaRaw
      ? apply(template.ctaLabel)
      : `CTA missing for ${template.id}`,
  };
}

export function inviteDraftsHaveDuplicateBodies(
  drafts: Record<string, Pick<VmbInviteTemplate, "body">>,
): boolean {
  const bodies = Object.values(drafts)
    .map((row) => row.body.trim())
    .filter(Boolean);
  return new Set(bodies).size < bodies.length;
}

export function debugPreview160(text: string | undefined): string {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return "(empty)";
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 160)}…`;
}

export const ADMIN_INVITE_RENDER_DEBUG_STYLE: CSSProperties = {
  background: "#fee2e2",
  border: "3px solid #dc2626",
  color: "#7f1d1d",
  padding: "12px 14px",
  marginBottom: "12px",
  fontFamily: "monospace",
  fontSize: "12px",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export function inviteDraftStats(drafts: Record<string, Pick<VmbInviteTemplate, "body">>): {
  count: number;
  uniqueBodies: number;
} {
  const rows = Object.values(drafts);
  return {
    count: rows.length,
    uniqueBodies: new Set(rows.map((row) => row.body.trim())).size,
  };
}
