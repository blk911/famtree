import type { VmbProviderPlatform } from "./trial";

export type VmbBookRecord = {
  id: string;
  clientName: string;
  email?: string;
  phone?: string;
  lastVisitDate?: string;
  serviceName?: string;
  providerName?: string;
  amountSpent?: number;
  visitCount?: number;
  notes?: string;
};

export type VmbBookUpload = {
  uploadId: string;
  trialId?: string;
  salonName?: string;
  providerPlatform?: string;
  recordCount: number;
  skippedRows: number;
  detectedColumns: string[];
  parseWarnings: string[];
  fileName?: string;
  createdAt: string;
};

export type ParseBookUploadInput = {
  rawText: string;
  providerPlatform?: VmbProviderPlatform;
};

export type ParseBookUploadResult = {
  records: VmbBookRecord[];
  warnings: string[];
  skippedRows: number;
  detectedColumns: string[];
  parsedRecordCount: number;
  providerMode?: VmbProviderPlatform | "generic";
};
