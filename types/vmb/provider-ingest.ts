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
  parseWarnings: string[];
  createdAt: string;
};

export type ParseBookUploadResult = {
  records: VmbBookRecord[];
  warnings: string[];
};
