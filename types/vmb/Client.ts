export type VmbClientServiceStatus = "active" | "lapsed" | "vip";

export type VmbTrustedProviderSlot = {
  category: string;
  providerName?: string;
  status: "connected" | "empty";
};

export interface VmbClient {
  id: string;
  name: string;
  primaryService: string;
  primaryServiceLabel: string;
  trustedProviders: VmbTrustedProviderSlot[];
  lastVisit?: string;
  status: VmbClientServiceStatus;
}
