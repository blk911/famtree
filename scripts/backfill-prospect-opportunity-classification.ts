import { listProspects, updateProspectClassification } from "../lib/studios/prospects/store";
import { classifyRelationshipOpportunity } from "../lib/studios/prospects/opportunity-classifier";

function toInput(prospect: Awaited<ReturnType<typeof listProspects>>[number]) {
  return {
    handle: prospect.identity.handle,
    displayName: prospect.identity.name,
    description: [prospect.identity.categoryGuess, prospect.sourceTopic, ...prospect.services].filter(Boolean).join(" "),
    sourceHashtags: prospect.sourceHashtags,
    sourcePath: prospect.sourcePath,
    bestUrl: prospect.bestMatch?.url,
    allMatchedUrls: prospect.allMatchedUrls.map((url) => url.url),
    platforms: prospect.platforms,
    evidence: prospect.evidence,
    vertical: prospect.vertical,
    category: prospect.identity.categoryGuess ?? undefined,
    educationType: prospect.educationType,
    audienceType: prospect.audienceType,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prospects = await listProspects();
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let skippedLocked = 0;
  let updated = 0;

  for (const prospect of prospects) {
    if (prospect.classificationLocked) {
      skippedLocked++;
      continue;
    }

    const classification = classifyRelationshipOpportunity(toInput(prospect));
    byCategory[classification.businessCategory] = (byCategory[classification.businessCategory] ?? 0) + 1;
    byType[classification.relationshipOpportunityType] = (byType[classification.relationshipOpportunityType] ?? 0) + 1;

    if (!dryRun) {
      await updateProspectClassification(prospect.prospectId, {
        ...classification,
        classificationLocked: false,
      });
    }
    updated++;
  }

  console.log(JSON.stringify({
    dryRun,
    total: prospects.length,
    updated,
    skippedLocked,
    byCategory,
    byRelationshipOpportunityType: byType,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
