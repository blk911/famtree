import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import {
  getInviteTemplateIdForCardType,
  inviteTemplateIdForType,
} from "@/lib/vmb/invite-templates/card-type-invite-template-map";
import type { VmbInviteType } from "@/lib/vmb/invite-templates/invite-template-types";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import { isSalonInviteMatchingActive } from "@/lib/vmb/invites/salon-invite-inventory";

export type PublishedCopyMatchSource =
  | "copy.sourceTemplateId"
  | "copy.snapshot.sourceTemplateId"
  | "none";

export type PublishedCopyMatchResult = {
  copy: SalonInviteLocalCopy | null;
  matchSource: PublishedCopyMatchSource;
  expectedTemplateId: string;
  normalizedExpectedTemplateId: string;
};

/** Stable nails-* template key — strips salon-scoped offer/storage prefixes when present. */
export function normalizeSourceTemplateId(raw: string | undefined | null): string | null {
  const id = raw?.trim();
  if (!id) return null;
  if (/^nails-[a-z0-9-]+$/i.test(id)) return id;
  const tail = id.match(/-(nails-[a-z0-9-]+)$/i);
  if (tail?.[1]) return tail[1];
  return id;
}

const OPPORTUNITY_CATEGORY_TO_TEMPLATE_ID: Partial<Record<TaikosOpportunityCategory, string>> = {
  "PCN Invite": inviteTemplateIdForType("private_client_network"),
  Birthday: inviteTemplateIdForType("birthday_celebration"),
  Referral: inviteTemplateIdForType("referral_invite"),
  Reactivation: inviteTemplateIdForType("we_miss_you"),
  Retention: inviteTemplateIdForType("refresh_reminder"),
  "Open Slot": inviteTemplateIdForType("open_chair"),
};

const CARD_TYPE_TO_INVITE_TYPE: Partial<Record<VmbCardType, VmbInviteType>> = {
  pcn_invite: "private_client_network",
  birthday_card: "birthday_celebration",
  referral_invite: "referral_invite",
  open_slot_fill: "open_chair",
  refresh_card: "refresh_reminder",
  reactivation_card: "we_miss_you",
  vip_thank_you: "vip_thank_you",
  service_card: "new_client_welcome",
};

export function expectedTemplateIdForCardType(cardType: VmbCardType): string {
  return (
    getInviteTemplateIdForCardType(cardType) ??
    (CARD_TYPE_TO_INVITE_TYPE[cardType]
      ? inviteTemplateIdForType(CARD_TYPE_TO_INVITE_TYPE[cardType]!)
      : `nails-${cardType.replace(/_/g, "-")}`)
  );
}

export function expectedTemplateIdForOpportunity(
  opportunity: TaikosOpportunity,
  suggestedCardType: VmbCardType,
): string {
  const fromCategory = OPPORTUNITY_CATEGORY_TO_TEMPLATE_ID[opportunity.category];
  if (fromCategory) return fromCategory;
  return expectedTemplateIdForCardType(suggestedCardType);
}

export function templateKeysForPublishedCopy(copy: SalonInviteLocalCopy): string[] {
  const keys = new Set<string>();
  const fromCopy = normalizeSourceTemplateId(copy.sourceTemplateId);
  const fromSnapshot = normalizeSourceTemplateId(copy.snapshot?.sourceTemplateId);
  if (fromCopy) keys.add(fromCopy);
  if (fromSnapshot) keys.add(fromSnapshot);
  return Array.from(keys);
}

/** Index published copies by normalized sourceTemplateId (copy + snapshot keys). */
export function indexPublishedCopiesByTemplateId(
  copies: SalonInviteLocalCopy[],
): Map<string, SalonInviteLocalCopy> {
  const map = new Map<string, SalonInviteLocalCopy>();
  for (const copy of copies) {
    if (!isSalonInviteMatchingActive(copy)) continue;
    for (const key of templateKeysForPublishedCopy(copy)) {
      const existing = map.get(key);
      if (!existing || copy.publishedVersion > existing.publishedVersion) {
        map.set(key, copy);
      }
    }
  }
  return map;
}

export function findPublishedCopyForTemplateId(
  copies: SalonInviteLocalCopy[],
  expectedTemplateId: string,
): PublishedCopyMatchResult {
  const normalizedExpectedTemplateId = normalizeSourceTemplateId(expectedTemplateId) ?? expectedTemplateId;
  const index = indexPublishedCopiesByTemplateId(copies);
  const hit = index.get(normalizedExpectedTemplateId) ?? null;
  if (!hit) {
    return {
      copy: null,
      matchSource: "none",
      expectedTemplateId,
      normalizedExpectedTemplateId,
    };
  }

  const copyKey = normalizeSourceTemplateId(hit.sourceTemplateId);
  const matchSource: PublishedCopyMatchSource =
    copyKey === normalizedExpectedTemplateId
      ? "copy.sourceTemplateId"
      : "copy.snapshot.sourceTemplateId";

  return {
    copy: hit,
    matchSource,
    expectedTemplateId,
    normalizedExpectedTemplateId,
  };
}

export type PublishedCopyDebugEntry = {
  copyId: string;
  salonId: string;
  sourceTemplateId: string;
  snapshotSourceTemplateId: string;
  normalizedKeys: string[];
  templateName: string;
  publishedVersion: number;
};

export function publishedCopiesForDebug(copies: SalonInviteLocalCopy[]): PublishedCopyDebugEntry[] {
  return copies.map((copy) => ({
    copyId: copy.id,
    salonId: copy.salonId,
    sourceTemplateId: copy.sourceTemplateId,
    snapshotSourceTemplateId: copy.snapshot?.sourceTemplateId ?? "",
    normalizedKeys: templateKeysForPublishedCopy(copy),
    templateName: copy.snapshot?.templateName ?? copy.sourceTemplateId,
    publishedVersion: copy.publishedVersion,
  }));
}
