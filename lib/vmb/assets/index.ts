import type { ServiceImageInput } from "./service-image-types";

export function serviceSlugFromOfferId(serviceOfferId?: string): string | undefined {
  const id = serviceOfferId?.trim();
  if (!id) return undefined;
  const match = /^default-[^-]+-(.+)$/.exec(id);
  return match?.[1] ?? id;
}

export function buildServiceImageInput(
  input: {
    serviceOfferId?: string;
    displayName?: string;
    imageUrl?: string | null;
    photoUrl?: string | null;
    lockedLibraryAssetId?: string | null;
    selectedLibraryImageUrl?: string | null;
  },
  salonId?: string,
  date?: Date,
): ServiceImageInput {
  return {
    serviceId: input.serviceOfferId,
    serviceSlug: serviceSlugFromOfferId(input.serviceOfferId),
    serviceName: input.displayName,
    salonId: salonId?.trim() || "vmb-demo-salon",
    uploadedImageUrl: input.imageUrl ?? input.photoUrl ?? null,
    lockedLibraryAssetId: input.lockedLibraryAssetId ?? null,
    selectedLibraryImageUrl: input.selectedLibraryImageUrl ?? null,
    date,
  };
}

export * from "./service-category-map";
export * from "./service-image-analytics";
export * from "./service-image-resolver";
export * from "./service-image-seed";
export * from "./service-image-types";
export * from "./service-photo-guardrails";
export * from "./service-photo-library";
export * from "./invite-art-guardrails";
export * from "./invite-art-library";
export * from "./invite-art-resolver";
export * from "./invite-art-types";
