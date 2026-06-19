export type VmbBookAnalysisCatalogItem = {
  analysisId: string;
  salonId: string;
  clientCount: number;
  createdAt: string;
  sourceName?: string;
};

export type VmbBookAnalysisCatalogResponse = {
  backend: "postgres" | "json";
  currentSalonId?: string;
  analyses: VmbBookAnalysisCatalogItem[];
};
