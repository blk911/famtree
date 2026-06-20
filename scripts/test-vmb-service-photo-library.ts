/**
 * npm run test:vmb:service-photos
 */
import {
  countAssetsByCategory,
  getServiceImage,
  resolveInviteServiceImageUrl,
  resolveServicePhotoCategory,
  servicePhotoLibrary,
} from "../lib/vmb/assets";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function run(): void {
  const requiredMinimums: Record<string, number> = {
    gel_manicure: 8,
    builder_gel: 6,
    structured_gel: 6,
    gel_x: 6,
    acrylic: 6,
    pedicure: 6,
    fill_refresh: 5,
    generic_salon: 4,
  };

  const counts = countAssetsByCategory();
  for (const [category, minimum] of Object.entries(requiredMinimums)) {
    assert(
      (counts[category as keyof typeof counts] ?? 0) >= minimum,
      `${category} has at least ${minimum} assets`,
    );
  }

  for (const asset of servicePhotoLibrary.filter((row) => row.active)) {
    assert(!!asset.imageUrl.trim(), `asset ${asset.id} has imageUrl`);
  }

  const uploaded = getServiceImage({
    serviceName: "Gel Manicure",
    uploadedImageUrl: "https://images.unsplash.com/photo-test-upload",
  });
  assert(uploaded.source === "uploaded", "uploaded image wins priority");
  assert(uploaded.imageUrl.includes("photo-test-upload"), "uploaded url returned");

  const locked = getServiceImage({
    serviceName: "Gel Manicure",
    lockedLibraryAssetId: "gel-manicure-001",
  });
  assert(locked.source === "locked_library", "locked asset beats rotation");
  assert(locked.assetId === "gel-manicure-001", "locked asset id preserved");

  const day = new Date("2026-06-12T12:00:00.000Z");
  const first = getServiceImage({
    salonId: "salon-a",
    serviceId: "default-nails-gel-manicure",
    serviceName: "Gel Manicure",
    date: day,
  });
  const second = getServiceImage({
    salonId: "salon-a",
    serviceId: "default-nails-gel-manicure",
    serviceName: "Gel Manicure",
    date: day,
  });
  assert(first.imageUrl === second.imageUrl, "same salon/service/day returns same image");
  assert(first.source === "rotating_library", "category match uses rotating library");

  const otherSalon = getServiceImage({
    salonId: "salon-b",
    serviceId: "default-nails-gel-manicure",
    serviceName: "Gel Manicure",
    date: day,
  });
  assert(!!otherSalon.imageUrl, "different salon still resolves a valid image");

  const unknown = getServiceImage({
    serviceName: "Mystery Treatment XYZ",
    salonId: "salon-a",
    date: day,
  });
  assert(
    resolveServicePhotoCategory("Mystery Treatment XYZ") === "generic_salon",
    "unknown service maps to generic category",
  );
  assert(unknown.source === "fallback" || unknown.category === "generic_salon", "unknown service falls back safely");

  const inviteFallback = resolveInviteServiceImageUrl({
    serviceName: "Gel Manicure",
    serviceId: "gel-manicure",
    salonId: "debug-salon",
  });
  assert(inviteFallback.startsWith("https://"), "invite fallback resolves real image URL");
  console.log("  invite resolver sample:", inviteFallback);

  const gelManicure = getServiceImage({
    serviceName: "Gel Manicure",
    serviceId: "gel-manicure",
    salonId: "debug-salon",
  });
  assert(gelManicure.imageUrl.startsWith("https://"), "gel manicure resolves real image URL");
  console.log("  gel manicure sample:", gelManicure.imageUrl);

  console.log("OK: VMB service photo library tests passed");
  console.log("  asset counts:", counts);
}

run();
