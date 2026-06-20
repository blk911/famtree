import type { ResolvedServiceImage } from "./service-image-types";

export interface ServiceImageExposureEvent {
  salonId?: string;
  serviceId?: string;
  serviceName?: string;
  assetId?: string;
  source: ResolvedServiceImage["source"];
  page: "service_presets" | "salon_page" | "invite_card" | "unknown";
}

export function trackServiceImageExposure(_event: ServiceImageExposureEvent): void {
  // TODO: wire to VMB analytics once click/conversion tracking is ready.
}
