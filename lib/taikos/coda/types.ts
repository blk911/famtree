import type { TaikosActionType } from "@/lib/taikos/types";

export type TaikosSalonPhase = "onboarding" | "growth" | "activation" | "retention";

export type TaikosContext = {
  salonId: string;
  ownerName: string;
  currentPhase: TaikosSalonPhase;
  verified: boolean;
  importedClientCount: number;
  pcnMemberCount: number;
};

export type TaikosObjective = {
  id: string;
  label: string;
  priority: number;
};

export type CodaActionLabel =
  | "Send PCN Invite"
  | "Send Refresh Invite"
  | "Create VIP Card"
  | "Generate Referral Opportunity"
  | "Create Birthday Card"
  | "Create Reactivation Card"
  | "Queue Smart Send";

export type TaikosInsight = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectLabel: string;
  objective: string;
  discovery: string;
  curiosityPrompt: string;
  suggestedAction: CodaActionLabel;
  actionType: TaikosActionType;
  confidence: number;
  opportunityId?: string;
};

export type CodaSearchResult = {
  query: string;
  matches: Array<{
    clientName: string;
    subjectLabel: string;
    matchReason: string;
    lastService?: string;
    lastVisit?: string;
    insightId?: string;
  }>;
};

export type CodaSummary = {
  context: TaikosContext;
  objective: TaikosObjective;
  insights: TaikosInsight[];
  insightCount: number;
  opportunityCount: number;
};
