/** tAIkOS response schema — UI renders schema, never raw model output. */

export type AiosSeverity = "info" | "notice" | "priority" | "urgent";

export type AiosActionKind =
  | "navigate"
  | "open_invites"
  | "open_clients"
  | "open_network"
  | "refresh_book"
  | "dismiss"
  | "ask";

export type AiosAction = {
  id: string;
  label: string;
  kind: AiosActionKind;
  href?: string;
  payload?: Record<string, string>;
};

export type AiosOpportunity = {
  id: string;
  title: string;
  description: string;
  estimatedValue: number;
  severity: AiosSeverity;
  sourceRule?: string;
};

export type AiosCard = {
  id: string;
  title: string;
  body: string;
  severity?: AiosSeverity;
  opportunities?: AiosOpportunity[];
  actions?: AiosAction[];
};

export type AiosPanelMode = "briefing" | "page-assistant" | "question" | "collapsed" | "idle-summary";

export type AiosResponse = {
  mode: AiosPanelMode;
  greeting?: string;
  summary: string;
  cards: AiosCard[];
  opportunities: AiosOpportunity[];
  recommendations: string[];
  estimatedValue: number;
  followUpPrompt?: string;
  pageContextLine?: string;
};

export type AiosPageId =
  | "dashboard"
  | "calendar"
  | "clients"
  | "network"
  | "offers"
  | "campaigns"
  | "invites"
  | "appointments"
  | "history"
  | "settings"
  | "refresh"
  | "unknown";

export type AiosPageContext = {
  pageId: AiosPageId;
  title: string;
  description: string;
  availableActions: AiosAction[];
};

export type AiosClientSummary = {
  totalClients: number;
  activeClients: number;
  overdueClients: number;
  birthdaysThisWeek: number;
  likelyReactivations: number;
  highValueClients: number;
};

export type AiosCalendarSummary = {
  openSlots: number;
  slots: string[];
};

export type AiosPcnSummary = {
  invitesReady: number;
  invitesApproved: number;
  invitesSent: number;
  membersJoined: number;
};

export type AiosRevenueSummary = {
  touchesReady: number;
  potentialRevenue: number;
};

export type AiosAlert = {
  id: string;
  message: string;
  severity: AiosSeverity;
};

export type AiosRecommendation = {
  id: string;
  message: string;
  estimatedValue: number;
  ruleId: string;
};

export type AiosContextPacket = {
  salonId: string;
  operatorId: string;
  salonName: string;
  analysisId?: string;
  currentPage: AiosPageContext;
  currentSession: AiosSessionSnapshot;
  calendarSummary: AiosCalendarSummary;
  clientSummary: AiosClientSummary;
  pcnSummary: AiosPcnSummary;
  revenueSummary: AiosRevenueSummary;
  opportunities: AiosOpportunity[];
  alerts: AiosAlert[];
  recommendations: AiosRecommendation[];
  lastLogin?: string;
  firstLoginToday: boolean;
  loginCountToday: number;
  lastViewedPage?: string;
  newActivity: boolean;
  generatedAt: string;
};

export type AiosSessionSnapshot = {
  firstLoginToday: boolean;
  loginCountToday: number;
  lastLoginAt?: string;
  lastViewedPage?: string;
  lastAiosInteractionAt?: string;
  aiosOpen: boolean;
  briefingShownToday: boolean;
  lastActivityWatermark?: string;
};

export type MorningBriefing = {
  greeting: string;
  summary: string;
  opportunities: AiosOpportunity[];
  recommendations: string[];
  estimatedValue: number;
  followUpPrompt: string;
  variant: "full" | "abbreviated" | "activity-only" | "skip";
};

export type AiosRuleResult = {
  ruleId: string;
  severity: AiosSeverity;
  value: number;
  recommendation: string;
  actions: AiosAction[];
  opportunity?: AiosOpportunity;
};

export type AiosAdapterId = "mock" | "openai" | "local";

export type GenerateAiosInput = {
  context: AiosContextPacket;
  mode: AiosPanelMode;
  question?: string;
};
