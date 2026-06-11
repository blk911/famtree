/** tAIkOS response schema — UI renders schema, never raw model output. */

import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";

export type AiosSeverity = "info" | "notice" | "priority" | "urgent";

export type AiosActionKind =
  | "navigate"
  | "open_invites"
  | "open_clients"
  | "open_network"
  | "refresh_book"
  | "dismiss"
  | "ask"
  | "contract";

export type TaikosActionType =
  | "CREATE_INVITE_DRAFT"
  | "CREATE_SERVICE_CARD_DRAFT"
  | "CREATE_CAMPAIGN_DRAFT"
  | "VIEW_CLIENT_SEGMENT"
  | "VIEW_CALENDAR_GAP"
  | "CONTINUE_PCN_INVITES"
  | "PREVIEW_REFERRAL_ASK"
  | "PREVIEW_REACTIVATION_MESSAGE"
  | "REFRESH_BOOK_ANALYSIS";

export type AiosAction = {
  id: string;
  label: string;
  kind: AiosActionKind;
  /** Typed VMB action contract — preview/confirm only in Phase 3. */
  contractType?: TaikosActionType;
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
  subtitle?: string;
  meta?: string;
  opportunities?: AiosOpportunity[];
  actions?: AiosAction[];
};

export type AiosPanelMode = "briefing" | "page-assistant" | "question" | "collapsed" | "idle-summary";

export type AiosPanelLayout = "modal" | "center-panel" | "docked" | "collapsed";

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
  | "today"
  | "activity"
  | "opportunities"
  | "queue"
  | "goals"
  | "payments"
  | "unknown";

export type AiosPageContext = {
  pageId: AiosPageId;
  title: string;
  description: string;
  assistantIntro: string;
  availableActions: AiosAction[];
};

export type AiosContactCandidate = {
  clientName: string;
  reason: string;
  estimatedValue: number;
};

export type AiosResponse = {
  mode: AiosPanelMode;
  layout?: AiosPanelLayout;
  greeting?: string;
  message?: string;
  summary: string;
  cards: AiosCard[];
  opportunities: AiosOpportunity[];
  recommendations: string[];
  recommendedActions: AiosAction[];
  estimatedValue: number;
  followUpPrompt?: string;
  pageContextLine?: string;
  pageContext?: AiosPageContext;
  showQuestionInput?: boolean;
  collapseAfterSeconds?: number;
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
  operatorName?: string;
  salonName: string;
  analysisId?: string;
  hasRealBookData: boolean;
  contactCandidates: AiosContactCandidate[];
  overdueClients: AiosContactCandidate[];
  saturdayCandidates: AiosContactCandidate[];
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
  draftSummary: TaikosDraftSummary;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  activitySummary: TaikosActivitySummary;
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
  greeting?: string;
  summary: string;
  opportunities: AiosOpportunity[];
  recommendations: string[];
  estimatedValue: number;
  followUpPrompt: string;
  variant: "full" | "abbreviated" | "activity-only" | "skip";
  showSunGreeting?: boolean;
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
