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
  ParseBookUploadResult,
} from "./provider-ingest";
export type {
  VmbOpportunityType,
  VmbBookOpportunity,
  VmbTrustedIntroOpportunity,
  VmbBookAnalysisResult,
  AnalyzeBookInput,
} from "./book-analysis";
export type {
  TrustedProviderIntroRequest,
  CreateTrustedIntroInput,
} from "./trusted-circle";
