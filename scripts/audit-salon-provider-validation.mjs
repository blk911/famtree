// One-off audit: salon prospects + validation stats (no push).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isConfirmed(p) {
  const pv = p.providerDiscoveryDebug?.providerValidation?.confirmed;
  if (pv?.confirmed) return true;
  if (p.bookingProvider === "glossgenius" && p.ggValidationStatus === "confirmed_client_page") {
    return true;
  }
  return false;
}

async function main() {
  const rows = await prisma.studioProspect.findMany({
    where: { vertical: "salon" },
    select: {
      id: true,
      handle: true,
      bookingProvider: true,
      bookingUrl: true,
      bookingProviderSource: true,
      bookingProviderConfidence: true,
      ggValidationStatus: true,
      providerDiscoveryDebug: true,
    },
  });

  let withBooking = 0;
  let ggField = 0;
  let confirmed = 0;
  let unconfirmedGgPill = 0;
  let validationRuns = 0;
  let rejectedGeneric = 0;
  let rejectedNotFound = 0;
  let candidateOnly = 0;

  for (const p of rows) {
    if (p.bookingProvider && p.bookingProvider !== "unknown") withBooking++;
    if (p.bookingProvider === "glossgenius") ggField++;
    if (isConfirmed(p)) confirmed++;
    if (p.bookingProvider === "glossgenius" && !isConfirmed(p)) unconfirmedGgPill++;

    const pv = p.providerDiscoveryDebug?.providerValidation;
    for (const v of pv?.validations ?? []) {
      validationRuns++;
      if (v.status === "candidate_only") candidateOnly++;
      if (
        v.status === "rejected_generic_homepage" ||
        v.status === "rejected_marketing_page" ||
        v.status === "rejected_redirect_home"
      ) {
        rejectedGeneric++;
      }
      if (v.status === "rejected_not_found") rejectedNotFound++;
    }
  }

  const importRaw = rows.filter(
    (p) =>
      ["glossgenius", "vagaro", "square", "booksy", "fresha"].includes(p.bookingProvider ?? "") &&
      (p.bookingProviderConfidence ?? 0) >= 55,
  ).length;
  const importConfirmed = rows.filter(
    (p) =>
      isConfirmed(p) && ["glossgenius", "vagaro"].includes(p.bookingProvider ?? ""),
  ).length;

  console.log(
    JSON.stringify(
      {
        salonProspects: rows.length,
        withBookingProviderField: withBooking,
        glossgeniusOnField: ggField,
        confirmedForDisplay: confirmed,
        unconfirmedGgWouldHidePill: unconfirmedGgPill,
        validationDiagnostics: {
          validationRows: validationRuns,
          candidateOnly,
          rejectedGeneric,
          rejectedNotFound,
        },
        importCandidateHeuristic: importRaw,
        importCandidateIfConfirmedOnly: importConfirmed,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
