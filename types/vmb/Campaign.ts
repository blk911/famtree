export type VmbCampaignType = "birthday" | "referral" | "seasonal" | "welcome";

export interface Campaign {
  id: string;
  name: string;
  type: VmbCampaignType;
  description: string;
  status: "draft" | "active" | "scheduled";
  estimatedReach?: number;
}
