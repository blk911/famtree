export type RevenueOpportunityType =
  | "reactivation"
  | "referral"
  | "gift"
  | "trusted_circle";

export interface RevenueOpportunity {
  id: string;
  type: RevenueOpportunityType;
  title: string;
  description: string;
  count: number;
  estimatedValue: number;
}
