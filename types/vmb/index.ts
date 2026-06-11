export type { VmbClient, VmbClientServiceStatus, VmbTrustedProviderSlot } from "./Client";
export type { TrustedProvider } from "./TrustedProvider";
export type { TrustedCircle } from "./TrustedCircle";
export type { Campaign, VmbCampaignType } from "./Campaign";
export type { RevenueOpportunity, RevenueOpportunityType } from "./RevenueOpportunity";

export type {
  VmbProviderPlatform,
  VmbTrialLead,
  CreateVmbTrialLeadInput,
} from "./trial";
export type {
  VmbBookRecord,
  VmbBookUpload,
  ParseBookUploadInput,
  ParseBookUploadResult,
} from "./provider-ingest";
export type {
  VmbOpportunityType,
  VmbBookOpportunity,
  VmbTrustedIntroOpportunity,
  VmbBookAnalysisResult,
  VmbParseSummary,
  AnalyzeBookInput,
} from "./book-analysis";
export type {
  TrustedProviderIntroRequest,
  CreateTrustedIntroInput,
} from "./trusted-circle";
export type {
  InviteDraftCategory,
  InviteDraftStatus,
  VmbInviteDraft,
  PatchInviteDraftInput,
} from "./invite-draft";
