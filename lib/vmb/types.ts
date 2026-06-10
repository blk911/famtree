import type { SalonBackOfficeImportRun } from "@/lib/intelligence/salon/backoffice/types";

export type VmbTrialLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  salonName: string;
  providerPlatform: string;
  createdAt: string;
};

export type VmbTrialRecord = VmbTrialLead & {
  importRuns: SalonBackOfficeImportRun[];
};

export type VmbTrialSignupInput = {
  name: string;
  email: string;
  phone: string;
  salonName: string;
  providerPlatform: string;
};
