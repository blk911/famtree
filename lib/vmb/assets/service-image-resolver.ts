import { resolveServicePhotoCategory } from "./service-category-map";
import {
  getActiveServiceAssets,
  getFallbackServiceAsset,
  getServiceAssetById,
} from "./service-photo-library";
import { getDateSeed, getSeededIndex } from "./service-image-seed";
import type { ResolvedServiceImage, ServiceImageInput } from "./service-image-types";

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
  const fallback = getFallbackServiceAsset();
  const chosen =
    assets.length > 0
      ? assets[
          getSeededIndex(
            [
              input.salonId,
              input.serviceId,
              input.serviceSlug,
              input.serviceName,
              getDateSeed(input.date),
            ],
            assets.length,
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
