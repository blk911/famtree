export type ActiveBookPointer = {
  salonId: string;
  analysisId: string;
  clientCount: number;
  recordCount: number;
  sourceFileName?: string;
  updatedAt: string;
};

export type SetActiveBookPointerInput = {
  salonId: string;
  analysisId: string;
  clientCount: number;
  recordCount: number;
  sourceFileName?: string;
};
