export type TrustedProviderIntroRequest = {
  requestId: string;
  trialId?: string;
  salonName?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  requestedCategory: string;
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  messageDraft: string;
  status: "draft" | "sent_to_client" | "client_completed" | "provider_invited";
  createdAt: string;
};

export type CreateTrustedIntroInput = {
  trialId?: string;
  salonName?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  requestedCategory: string;
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
};
