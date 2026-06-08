// Local audit runner: uses Postgres directly (bypasses JSON store default).
import { PrismaClient } from "@prisma/client";

process.env.PROSPECT_STORE_BACKEND = "postgres";

const prisma = new PrismaClient();

function rowToProspect(row) {
  return {
    prospectId: row.id,
    identityFingerprint: row.identityFingerprint,
    vertical: row.vertical,
    source: {
      sourceType: row.sourceType,
      batchId: row.batchId,
      sourceHandle: row.sourceHandle,
      sourceDisplayName: row.sourceDisplayName,
    },
    sourcePlatform: row.sourcePlatform,
    sourceTool: row.sourceTool,
    sourcePath: row.sourcePath,
    sourceHashtag: row.sourceHashtag,
    sourceHashtags: row.sourceHashtags ?? [],
    runId: row.runId,
    harvestDate: row.harvestDate,
    identity: {
      name: row.name,
      handle: row.handle,
      categoryGuess: row.categoryGuess,
      locationGuess: row.locationGuess,
    },
    platforms: row.platforms ?? [],
    bestMatch: row.bestMatchUrl
      ? {
          platform: row.bestMatchPlatform ?? "unknown",
          url: row.bestMatchUrl,
          confidence: row.bestMatchConf ?? 0,
          matchReason: row.bestMatchReason ?? "",
        }
      : null,
    allMatchedUrls: row.allMatchedUrls ?? [],
    services: row.services ?? [],
    evidence: row.evidence ?? [],
    confidence: {
      identity: row.confIdentity,
      booking: row.confBooking,
      category: row.confCategory,
      location: row.confLocation,
      overall: row.confOverall,
    },
    validationStatus: row.validationStatus,
    archiveReason: row.archiveReason,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    bookingProvider: row.bookingProvider,
    bookingProviderLabel: row.bookingProviderLabel,
    bookingUrl: row.bookingUrl,
    bookingProviderConfidence: row.bookingProviderConfidence,
    bookingProviderEvidence: row.bookingProviderEvidence,
    bookingProviderSource: row.bookingProviderSource,
    ggResolverStatus: row.ggResolverStatus,
    ggCheckedUrls: row.ggCheckedUrls,
    ggCandidateUrls: row.ggCandidateUrls,
    ggValidatedUrl: row.ggValidatedUrl,
    ggValidationStatus: row.ggValidationStatus,
    ggResolverReason: row.ggResolverReason,
    providerResolverReason: row.providerResolverReason,
    providerDiscoveryDebug: row.providerDiscoveryDebug,
  };
}

async function main() {
  const limit = Number(process.argv[2] ?? 250);
  const rows = await prisma.studioProspect.findMany({
    where: { vertical: "salon" },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  const prospects = rows.map(rowToProspect);
  console.log(JSON.stringify({ loaded: prospects.length, note: "postgres direct" }));

  const { enrichSalonProviderDiscovery } = await import(
    "../lib/intelligence/salon/salon-provider-discovery.ts"
  );
  const { runSalonStackBackfill } = await import(
    "../lib/intelligence/salon/business-stack/backfill-runner.ts"
  );
  const { buildProviderAuditReport } = await import(
    "../lib/intelligence/salon/business-stack/provider-audit.ts"
  );

  console.log("--- provider-discovery pipeline (per prospect) ---");
  let pdStats = {
    checked: 0,
    confirmed: 0,
    candidatesFound: 0,
    validationsRun: 0,
    rejectedGeneric: 0,
    stillUnknown: 0,
  };
  const { upsertProspect } = await import("../lib/studios/prospects/store.ts");

  for (const p of prospects) {
    pdStats.checked++;
    const result = await enrichSalonProviderDiscovery(
      {
        instagramHandle: p.identity.handle,
        displayName: p.identity.name,
        bestMatchUrl: p.bestMatch?.url,
        linkTrailUrlsScanned: [],
      },
      { enableGgFallback: true },
    );
    const pv = result.providerDiscoveryDebug?.providerValidation;
    pdStats.candidatesFound += pv?.candidates?.length ?? 0;
    for (const v of pv?.validations ?? []) {
      pdStats.validationsRun++;
      if (v.confirmed) pdStats.confirmed++;
      if (
        v.status === "rejected_generic_homepage" ||
        v.status === "rejected_marketing_page" ||
        v.status === "rejected_redirect_home"
      ) {
        pdStats.rejectedGeneric++;
      }
    }
    if (!result.bookingProvider) pdStats.stillUnknown++;

    const { prospectId, createdAt, updatedAt, validationStatus, archiveReason, status, notes, ...rest } = p;
    await upsertProspect({
      ...rest,
      bookingProvider: result.bookingProvider,
      bookingProviderLabel: result.bookingProviderLabel,
      bookingUrl: result.bookingUrl,
      bookingProviderConfidence: result.bookingProviderConfidence,
      bookingProviderEvidence: result.bookingProviderEvidence,
      bookingProviderSource: result.bookingProviderSource,
      ggValidationStatus: result.ggValidationStatus,
      ggValidatedUrl: result.ggValidatedUrl,
      ggCheckedUrls: result.ggCheckedUrls,
      ggCandidateUrls: result.ggCandidateUrls,
      ggResolverStatus: result.ggResolverStatus,
      ggResolverReason: result.ggResolverReason,
      providerDiscoveryDebug: result.providerDiscoveryDebug,
      suggestedValidationStatus: validationStatus,
    });
  }
  console.log(JSON.stringify({ providerDiscovery: pdStats }, null, 2));

  console.log("--- business-stack backfill ---");
  const refreshed = (await prisma.studioProspect.findMany({
    where: { vertical: "salon" },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })).map(rowToProspect);

  const stackSummary = await runSalonStackBackfill(refreshed, {
    crawlWebsite: false,
    persistBookingUpgrade: true,
  });
  console.log(JSON.stringify({ businessStack: stackSummary }, null, 2));

  const audit = await buildProviderAuditReport({ limit: 500 });
  console.log(JSON.stringify({ providerAudit: audit }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
