export type NetworkCandidate = {
  clientName: string;
  candidateScore: number;
  visitCount: number;
  recencyScore: number;
  spendScore: number;
};

export type NetworkLaunchSummary = {
  topCandidates: number;
  invited: number;
  joined: number;
  remaining: number;
  readyThisWeek: number;
  candidates: NetworkCandidate[];
};

export type NewClientWelcomeRow = {
  id: string;
  clientName: string;
  welcomeMessage: string;
  includesPrivateInvite: boolean;
};

export type NewClientSummary = {
  newClientsThisWeek: number;
  readyToWelcome: number;
  rows: NewClientWelcomeRow[];
};

export type WeeklyRevenueOpportunity = {
  id: string;
  clientName: string;
  reason: string;
  suggestedAction: string;
  potentialRevenue: number;
};

export type WeeklyRevenueSummary = {
  longTimeNoSee: number;
  bookNextAppointment: number;
  birthday: number;
  potentialRevenue: number;
  readyThisWeek: number;
  opportunities: WeeklyRevenueOpportunity[];
};

export type StandardOffer = {
  id: string;
  name: string;
  suggestedUse: string;
};

export type VmbOperatingSnapshot = {
  salonName: string;
  analysisId?: string;
  network: NetworkLaunchSummary;
  newClients: NewClientSummary;
  weeklyRevenue: WeeklyRevenueSummary;
  standardOffers: StandardOffer[];
};
