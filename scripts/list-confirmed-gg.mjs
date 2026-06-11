import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.studioProspect.findMany({ where: { bookingProvider: "glossgenius" } });
for (const r of rows) {
  const c = r.providerDiscoveryDebug?.providerValidation?.confirmed;
  console.log(JSON.stringify({
    handle: r.handle,
    bookingUrl: r.bookingUrl,
    ggValidationStatus: r.ggValidationStatus,
    status: c?.status,
    reason: c?.reason,
    finalUrl: c?.finalUrl,
    negative: c?.negativeMarkers,
  }));
}
await p.$disconnect();
