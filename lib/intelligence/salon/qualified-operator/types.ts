// lib/intelligence/salon/qualified-operator/types.ts

import type { SalonBusinessStack } from "../business-stack/types";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

export type QualificationStatus =
  | "campaign_ready"
  | "qualified"
  | "needs_enrichment"
  | "prospect_only"
  | "rejected";

export type RecommendedNextAction =
  | "launch_import_campaign"
  | "run_business_stack_backfill"
  | "run_ig_url_backfill"
  | "validate_booking_provider"
  | "run_public_presence"
  | "review_operator"
  | "no_action";

export type QualificationReasonCode =
  | "confirmed_booking_provider"
  | "business_stack_signals"
  | "import_candidate"
  | "contact_or_website_found"
  | "high_social_signal"
  | "high_provider_confidence"
  | "no_url_no_provider"
  | "validation_rejected_or_generic"
  | "insufficient_stack"
  | "missing_confirmed_booking"
  | "low_overall_score";

export type QualificationReason = {
  code: QualificationReasonCode;
  label: string;
  delta: number;
};

export type QualifiedOperatorInput = {
  prospect: ProspectRecord;
  stack?: SalonBusinessStack | null;
  confirmedBooking?: boolean;
  importCandidate?: boolean;
};

export type QualifiedOperatorResult = {
  prospectId: string;
  instagramHandle: string;
  displayName: string;
  businessCategory: string | null;
  bookingProvider?: string;
  bookingProviderLabel?: string;
  bookingProviderConfidence?: number;
  qualifiedOperatorScore: number;
  qualificationStatus: QualificationStatus;
  qualificationReasons: QualificationReason[];
  recommendedNextAction: RecommendedNextAction;
  importCandidate: boolean;
  confirmedBooking: boolean;
  stackSignalCount: number;
  hasContactOrWebsite: boolean;
  highSocialSignal: boolean;
  validationPenalty: boolean;
};

export const QUALIFICATION_STATUS_LABELS: Record<QualificationStatus, string> = {
  campaign_ready: "Campaign ready",
  qualified: "Qualified",
  needs_enrichment: "Needs enrichment",
  prospect_only: "Prospect only",
  rejected: "Rejected",
};

export const QUALIFICATION_STATUS_COLORS: Record<
  QualificationStatus,
  { bg: string; fg: string }
> = {
  campaign_ready: { bg: "#dcfce7", fg: "#14532d" },
  qualified: { bg: "#dbeafe", fg: "#1e40af" },
  needs_enrichment: { bg: "#fef3c7", fg: "#b45309" },
  prospect_only: { bg: "#f5f5f4", fg: "#57534e" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
};

export const RECOMMENDED_ACTION_LABELS: Record<RecommendedNextAction, string> = {
  launch_import_campaign: "Launch import / Hidden Money campaign",
  run_business_stack_backfill: "Run business stack backfill",
  run_ig_url_backfill: "Run IG URL backfill",
  validate_booking_provider: "Validate booking provider URL",
  run_public_presence: "Run public presence discovery",
  review_operator: "Manual operator review",
  no_action: "No action needed",
};
