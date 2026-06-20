import { resolveServicePhotoCategory } from "./service-category-map";
import {
  getActiveServiceAssets,
  getFallbackServiceAsset,
  getServiceAssetById,
} from "./service-photo-library";
import { getDateSeed, getSeededIndex } from "./service-image-seed";
import type { ResolvedServiceImage, ServiceImageInput, ServicePhotoAsset } from "./service-image-types";

function normalizedNeedle(input: ServiceImageInput): string {
  return [input.serviceName, input.serviceSlug, input.serviceId].filter(Boolean).join(" ").toLowerCase();
}

function hasAnyTag(asset: ServicePhotoAsset, tags: string[]): boolean {
  return tags.some((tag) => asset.tags.some((assetTag) => assetTag.toLowerCase().includes(tag)));
}

function preferenceScore(asset: ServicePhotoAsset, input: ServiceImageInput): number {
  const needle = normalizedNeedle(input);
  let score = 0;

  if (/gel[-\s]?x|extension|full[-\s]?set/.test(needle)) {
    if (asset.nailLength === "long") score += 4;
    if (hasAnyTag(asset, ["extensions", "gel-x", "full-set", "long"])) score += 3;
  }

  if (/acrylic/.test(needle)) {
    if (asset.nailLength === "long") score += 4;
    if (hasAnyTag(asset, ["acrylic", "extensions", "full-set", "long"])) score += 3;
  }

  if (/pedicure|feet|toe/.test(needle)) {
    if (asset.shotType === "feet") score += 5;
    if (hasAnyTag(asset, ["pedicure", "feet", "toes", "spa"])) score += 3;
  }

  if (/builder|structured/.test(needle)) {
    if (asset.shotType === "hands" || asset.shotType === "tools") score += 2;
    if (asset.style === "natural" || asset.style === "neutral") score += 3;
    if (hasAnyTag(asset, ["builder", "structured", "natural", "neutral", "overlay"])) score += 2;
  }

  if (/fill|refill|refresh|maintenance/.test(needle)) {
    if (hasAnyTag(asset, ["fill", "refill", "maintenance", "refresh"])) score += 5;
    if (asset.nailLength === "medium") score += 1;
  }

  return score;
}

function preferredAssetPool(assets: ServicePhotoAsset[], input: ServiceImageInput): ServicePhotoAsset[] {
  const scored = assets
    .map((asset) => ({ asset, score: preferenceScore(asset, input) }))
    .filter((row) => row.score > 0);

  if (scored.length === 0) return assets;
  const bestScore = Math.max(...scored.map((row) => row.score));
  return scored.filter((row) => row.score >= Math.max(1, bestScore - 1)).map((row) => row.asset);
}

export function getServiceImage(input: ServiceImageInput): ResolvedServiceImage {
  const uploadedImageUrl = input.uploadedImageUrl?.trim();
  if (uploadedImageUrl) {
    return {
      imageUrl: uploadedImageUrl,
      title: input.serviceName ? `${input.serviceName} photo` : "Service photo",
      source: "uploaded",
    };
  }

  const lockedAsset = getServiceAssetById(input.lockedLibraryAssetId);
  if (lockedAsset) {
    return {
      imageUrl: lockedAsset.imageUrl,
      title: lockedAsset.title,
      source: "locked_library",
      assetId: lockedAsset.id,
      category: lockedAsset.category,
      photographer: lockedAsset.photographer,
      sourceName: lockedAsset.sourceName,
      sourceUrl: lockedAsset.sourceUrl,
    };
  }

  const selectedLibraryImageUrl = input.selectedLibraryImageUrl?.trim();
  if (selectedLibraryImageUrl) {
    return {
      imageUrl: selectedLibraryImageUrl,
      title: input.serviceName ? `${input.serviceName} selected image` : "Selected service image",
      source: "locked_library",
    };
  }

  const category = resolveServicePhotoCategory(input.serviceName ?? input.serviceSlug);
  const assets = getActiveServiceAssets(category);
  const preferredAssets = preferredAssetPool(assets, input);
  const fallback = getFallbackServiceAsset();
  const chosen =
    preferredAssets.length > 0
      ? preferredAssets[
          getSeededIndex(
            [
              input.salonId,
              input.serviceId,
              input.serviceSlug,
              input.serviceName,
              getDateSeed(input.date),
            ],
            preferredAssets.length,
          )
        ]
      : fallback;
  const asset = chosen ?? fallback;

  return {
    imageUrl: asset.imageUrl,
    title: asset.title,
    source: asset.category === "generic_salon" ? "fallback" : "rotating_library",
    assetId: asset.id,
    category: asset.category,
    photographer: asset.photographer,
    sourceName: asset.sourceName,
    sourceUrl: asset.sourceUrl,
  };
}

export function resolveInviteServiceImageUrl(input: {
  serviceImageUrl?: string | null;
  serviceName?: string;
  serviceId?: string;
  salonId?: string;
}): string {
  const explicit = input.serviceImageUrl?.trim();
  if (explicit) return explicit;

  const serviceName = input.serviceName?.trim();
  if (!serviceName) {
    return getFallbackServiceAsset().imageUrl;
  }

  return getServiceImage({
    serviceName,
    serviceId: input.serviceId,
    salonId: input.salonId?.trim() || "vmb-demo-salon",
  }).imageUrl;
}
