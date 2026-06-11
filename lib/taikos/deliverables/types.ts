export type DeliverableStatus = "draft" | "preview" | "recorded";

export type InviteDeliverable = {
  draftId: string;
  type: "invite";
  title: string;
  audience: string;
  message: string;
  suggestedClients: string[];
  estimatedValue: number;
  status: DeliverableStatus;
};

export type ServiceCardDeliverable = {
  draftId: string;
  type: "service_card";
  title: string;
  serviceName: string;
  description: string;
  priceDisplay?: string;
  visualPrompt?: string;
  callToAction: string;
  status: DeliverableStatus;
};

export type CampaignDeliverable = {
  draftId: string;
  type: "campaign";
  title: string;
  objective: string;
  audience: string;
  message: string;
  recommendedSendWindow: string;
  estimatedValue: number;
  status: DeliverableStatus;
};

export type ReferralAskDeliverable = {
  draftId: string;
  type: "referral_ask";
  title: string;
  referrer: string;
  message: string;
  rewardSuggestion: string;
  status: DeliverableStatus;
};

export type ReactivationDeliverable = {
  draftId: string;
  type: "reactivation";
  title: string;
  client: string;
  message: string;
  reason: string;
  estimatedValue: number;
  status: DeliverableStatus;
};

export type ClientSegmentDeliverable = {
  draftId: string;
  type: "client_segment";
  title: string;
  segment: string;
  clientNames: string[];
  count: number;
  filterHref: string;
  status: DeliverableStatus;
};

export type CalendarGapDeliverable = {
  draftId: string;
  type: "calendar_gap";
  title: string;
  slots: string[];
  likelyClients: string[];
  message: string;
  status: DeliverableStatus;
};

export type TaikosDeliverable =
  | InviteDeliverable
  | ServiceCardDeliverable
  | CampaignDeliverable
  | ReferralAskDeliverable
  | ReactivationDeliverable
  | ClientSegmentDeliverable
  | CalendarGapDeliverable;
