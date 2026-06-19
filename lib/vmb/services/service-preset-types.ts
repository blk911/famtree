import type { ServiceCategoryId } from "./canonical-catalog-types";
import type { SalonServiceLifecycleStatus } from "./salon-service-lifecycle";

/** Launch onboarding signoff — surfaced later during book ingest / launch flow. */
export type SalonServiceSignoffStatus = "pending" | "reviewed" | "approved";

export type SalonServiceMenuSignoff = {
  salonId: string;
  status: SalonServiceSignoffStatus;
  updatedAt: string;
};

export type ServiceAddonPreset = {
  addonId: string;
  label: string;
  priceCents: number;
  active: boolean;
  defaultSelected: boolean;
  sortOrder: number;
};

/** Platform preset card — always linked to a canonical serviceOfferId. */
export type ServicePresetCard = {
  id: string;
  categoryId: ServiceCategoryId;
  serviceOfferId: string;
  displayName: string;
  shortDescription: string;
  basePriceCents: number;
  durationMinutes: number;
  includedText: string;
  defaultEnabled: boolean;
  active: boolean;
  sortOrder: number;
  addonPresets: ServiceAddonPreset[];
  updatedAt?: string;
};

/** Salon-facing merged offer for /vmb/service-presets. */
export type SalonFacingServiceOffer = {
  serviceOfferId: string;
  displayName: string;
  shortDescription: string;
  includedText: string;
  priceCents: number;
  durationMinutes: number;
  status: SalonServiceLifecycleStatus;
  sortOrder: number;
  adminBasePriceCents: number;
  adminDurationMinutes: number;
  hasSalonConfig: boolean;
  addons: Array<{
    addonId: string;
    label: string;
    priceCents: number;
    defaultPriceCents: number;
    enabled: boolean;
  }>;
};

export function presetIdForServiceOffer(serviceOfferId: string): string {
  return serviceOfferId.replace(/^default-/, "preset-");
}
