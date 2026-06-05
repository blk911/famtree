// lib/intelligence/transpo/payers/payer-types.ts

export type TranspoPayerCategory =
  | "medicaid"
  | "medicare"
  | "veterans_affairs"
  | "area_agency_on_aging"
  | "county_transit"
  | "public_health"
  | "meal_program"
  | "private";

export type TranspoPayerRecord = {
  payerId: string;
  state: string;
  region: string;
  payerName: string;
  category: TranspoPayerCategory;
  serviceCategories: string[];
  website?: string;
  notes?: string;
};
