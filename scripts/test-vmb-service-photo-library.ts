/**

 * npm run test:vmb:service-photos

 */

import {

  countAssetsByCategory,

  getServiceImage,

  resolveInviteServiceImageUrl,

  resolveServicePhotoCategory,

  servicePhotoLibrary,

  validateServicePhotoLibrary,

} from "../lib/vmb/assets";



function assert(condition: boolean, message: string): void {

  if (!condition) {

    console.error(`FAIL: ${message}`);

    process.exit(1);

  }

}



function run(): void {

  const requiredMinimums: Record<string, number> = {

    gel_manicure: 14,

    builder_gel: 10,

    structured_gel: 10,

    gel_x: 12,

    acrylic: 12,

    pedicure: 12,

    fill_refresh: 10,

    generic_salon: 8,

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



  const guardrailViolations = validateServicePhotoLibrary(servicePhotoLibrary);

  if (guardrailViolations.length > 0) {

    for (const violation of guardrailViolations) {

      console.error(

        `FAIL: ${violation.assetId} (${violation.category}) ${violation.rule}: ${violation.detail}`,

      );

    }

    process.exit(1);

  }



  const gelXImage = getServiceImage({

    serviceName: "Gel-X Extensions",

    serviceId: "default-nails-gel-x",

    salonId: "guardrail-salon",

    date: new Date("2026-06-12T12:00:00.000Z"),

  });

  assert(gelXImage.category === "gel_x", "gel-x resolves to gel_x category pool");

  const gelXAsset = servicePhotoLibrary.find((asset) => asset.id === gelXImage.assetId);
  assert(gelXAsset?.nailLength === "long", "gel-x resolves to long extension photography");
  assert(gelXAsset.tags.includes("extensions"), "gel-x resolves to extension-tagged photography");



  const pedicureImage = getServiceImage({

    serviceName: "Smart Pedicure",

    serviceId: "default-nails-pedicure",

    salonId: "guardrail-salon",

    date: new Date("2026-06-12T12:00:00.000Z"),

  });

  assert(pedicureImage.category === "pedicure", "pedicure resolves to pedicure category pool");

  const pedicureAsset = servicePhotoLibrary.find((asset) => asset.id === pedicureImage.assetId);
  assert(pedicureAsset?.shotType === "feet", "pedicure resolves to feet photography");
  assert(pedicureAsset.tags.some((tag) => tag === "pedicure" || tag === "feet"), "pedicure resolves to pedicure-tagged photography");



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

  assert(

    !first.imageUrl.includes("/3997991/"),

    "gel manicure never resolves to pedicure photography",

  );



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



  const gelManicure = getServiceImage({

    serviceName: "Gel Manicure",

    serviceId: "gel-manicure",

    salonId: "debug-salon",

  });

  assert(gelManicure.imageUrl.startsWith("https://"), "gel manicure resolves real image URL");



  console.log("OK: VMB service photo library tests passed");

  console.log("  asset counts:", counts);

  console.log("  category guardrails: enforced");

}



run();


