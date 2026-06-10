export type VmbProviderPlatform =
  | "glossgenius"
  | "vagaro"
  | "square"
  | "fresha"
  | "sola"
  | "booksy"
  | "styleseat"
  | "acuity"
  | "schedulicity"
  | "boulevard"
  | "mindbody"
  | "mangomint"
  | "phorest"
  | "other";

export type VmbTrialLead = {
  id: string;
  salonName: string;
  ownerName: string;
  email: string;
  phone?: string;
  providerPlatform?: VmbProviderPlatform;
  createdAt: string;
};

export type CreateVmbTrialLeadInput = {
  salonName?: string;
  ownerName: string;
  email: string;
  phone?: string;
  providerPlatform?: VmbProviderPlatform;
};
