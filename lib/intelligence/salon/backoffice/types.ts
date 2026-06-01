// lib/intelligence/salon/backoffice/types.ts
// Normalized types for owner-approved salon back-office export imports
// (GlossGenius, Vagaro, Square, etc.). Upload-only — no scraping.

export type SalonBackOfficeProvider =
  | "glossgenius"
  | "vagaro"
  | "square"
  | "fresha"
  | "booksy"
  | "unknown";

export type SalonBackOfficeEntity =
  | "clients"
  | "appointments"
  | "payments"
  | "services"
  | "products"
  | "memberships"
  | "staff"
  | "notes"
  | "reviews"
  | "unknown";

export type SchemaConfidence = "high" | "medium" | "low";

export type NormalizedSalonClient = {
  type: "client";
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  tags?: string[];
  notes?: string;
  raw?: Record<string, unknown>;
};

export type NormalizedSalonAppointment = {
  type: "appointment";
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName?: string;
  staffName?: string;
  appointmentDate?: string;
  status?: string;
  price?: number;
  raw?: Record<string, unknown>;
};

export type NormalizedSalonPayment = {
  type: "payment";
  clientName?: string;
  serviceName?: string;
  staffName?: string;
  paymentDate?: string;
  amount?: number;
  tip?: number;
  paymentStatus?: string;
  raw?: Record<string, unknown>;
};

export type NormalizedSalonRecord =
  | NormalizedSalonClient
  | NormalizedSalonAppointment
  | NormalizedSalonPayment;

export type HiddenMoneyOpportunity = {
  id: string;
  title: string;
  description: string;
  estimatedValue?: string;
  confidence: SchemaConfidence;
};

export type HiddenMoneyReport = {
  id: string;
  importRunId: string;
  summary: string;
  metrics: {
    clients?: number;
    appointments?: number;
    payments?: number;
    totalRevenue?: number;
    avgTicket?: number;
    missingEmailCount?: number;
    missingPhoneCount?: number;
  };
  opportunities: HiddenMoneyOpportunity[];
  createdAt: string;
};

export type SalonBackOfficeImportRun = {
  id: string;
  provider: SalonBackOfficeProvider;
  entity: SalonBackOfficeEntity;
  fileName: string;
  rowCount: number;
  mappedCount: number;
  unmappedHeaders: string[];
  schemaConfidence: SchemaConfidence;
  normalizedPreview: NormalizedSalonRecord[];
  report?: HiddenMoneyReport;
  createdAt: string;
};

export type SchemaDetection = {
  provider: SalonBackOfficeProvider;
  entity: SalonBackOfficeEntity;
  schemaConfidence: SchemaConfidence;
  /** normalized field key → source column header (original casing). */
  mappings: Record<string, string>;
  unmappedHeaders: string[];
};
