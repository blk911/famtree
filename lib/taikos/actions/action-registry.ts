import type { AiosAction } from "@/lib/taikos/types";
import type { TaikosActionType } from "@/lib/taikos/types";

export type ActionRegistryEntry = {
  type: TaikosActionType;
  label: string;
  description: string;
  source: string;
};

export const ACTION_REGISTRY: Record<TaikosActionType, ActionRegistryEntry> = {
  CREATE_INVITE_DRAFT: {
    type: "CREATE_INVITE_DRAFT",
    label: "Preview Invite",
    description: "Draft a client invite from this week's book signals.",
    source: "taikos:invite",
  },
  CREATE_SERVICE_CARD_DRAFT: {
    type: "CREATE_SERVICE_CARD_DRAFT",
    label: "Create Service Card",
    description: "Draft a service card for your salon offers.",
    source: "taikos:service-card",
  },
  CREATE_CAMPAIGN_DRAFT: {
    type: "CREATE_CAMPAIGN_DRAFT",
    label: "Build Campaign",
    description: "Draft a weekly relationship campaign.",
    source: "taikos:campaign",
  },
  VIEW_CLIENT_SEGMENT: {
    type: "VIEW_CLIENT_SEGMENT",
    label: "View Clients",
    description: "Preview an overdue client segment from your book.",
    source: "taikos:segment",
  },
  VIEW_CALENDAR_GAP: {
    type: "VIEW_CALENDAR_GAP",
    label: "Fill Saturday",
    description: "Preview open slots and likely bookings.",
    source: "taikos:calendar",
  },
  CONTINUE_PCN_INVITES: {
    type: "CONTINUE_PCN_INVITES",
    label: "Continue PCN",
    description: "Continue your Private Client Network invitations.",
    source: "taikos:pcn",
  },
  PREVIEW_REFERRAL_ASK: {
    type: "PREVIEW_REFERRAL_ASK",
    label: "Preview Referral Ask",
    description: "Draft a referral ask for a top client.",
    source: "taikos:referral",
  },
  PREVIEW_REACTIVATION_MESSAGE: {
    type: "PREVIEW_REACTIVATION_MESSAGE",
    label: "Preview Reactivation",
    description: "Draft a reactivation message for an overdue client.",
    source: "taikos:reactivation",
  },
  REFRESH_BOOK_ANALYSIS: {
    type: "REFRESH_BOOK_ANALYSIS",
    label: "Refresh Book",
    description: "Record intent to refresh your client book analysis.",
    source: "taikos:refresh",
  },
};

export function resolveActionTypeFromLabel(label: string): TaikosActionType | undefined {
  const normalized = label.trim().toLowerCase();
  const entries = Object.values(ACTION_REGISTRY);
  const match = entries.find((e) => e.label.toLowerCase() === normalized);
  return match?.type;
}

export function mapLegacyActionId(id: string): TaikosActionType | undefined {
  const map: Record<string, TaikosActionType> = {
    "preview-invite": "CREATE_INVITE_DRAFT",
    "approve-drafts": "CREATE_INVITE_DRAFT",
    "continue-pcn": "CONTINUE_PCN_INVITES",
    "network-invites": "CONTINUE_PCN_INVITES",
    "build-campaign": "CREATE_CAMPAIGN_DRAFT",
    "history": "CREATE_CAMPAIGN_DRAFT",
    "view-clients": "VIEW_CLIENT_SEGMENT",
    "this-week": "VIEW_CLIENT_SEGMENT",
    "open-calendar": "VIEW_CALENDAR_GAP",
    "fill-slots": "VIEW_CALENDAR_GAP",
    "refresh-book": "REFRESH_BOOK_ANALYSIS",
    "service-card": "CREATE_SERVICE_CARD_DRAFT",
    "referral-ask": "PREVIEW_REFERRAL_ASK",
    "reactivation": "PREVIEW_REACTIVATION_MESSAGE",
  };
  return map[id];
}

export function resolveContractType(action: AiosAction): TaikosActionType | undefined {
  if (action.contractType) return action.contractType;
  const fromId = mapLegacyActionId(action.id);
  if (fromId) return fromId;
  return resolveActionTypeFromLabel(action.label);
}

export function contractAction(
  id: string,
  contractType: TaikosActionType,
  label?: string,
  payload?: Record<string, string>,
): AiosAction {
  const reg = ACTION_REGISTRY[contractType];
  return {
    id,
    label: label ?? reg.label,
    kind: "contract",
    contractType,
    payload,
  };
}
