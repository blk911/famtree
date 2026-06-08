// Seed salon prospects from latest hashtag harvest JSON into Postgres (local audit only).
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const path = "runtime-data/studios/hashtag-harvest/harvest-1780418089010-zinga.json";

async function main() {
  const data = JSON.parse(readFileSync(path, "utf8"));
  let n = 0;
  for (const r of data.results ?? []) {
    const s = r.seed;
    if (!s?.handle || !r.prospectId) continue;
    const handle = s.handle.replace(/^@+/, "").toLowerCase();
    const id = r.prospectId;
    const now = new Date();
    await prisma.studioProspect.upsert({
      where: { id },
      create: {
        id,
        vertical: "salon",
        sourcePlatform: "instagram",
        sourceType: "hashtag_harvest",
        sourceTool: "hashtag_harvest",
        sourcePath: path,
        sourceHashtag: s.sourceHashtag,
        sourceHashtags: [s.sourceHashtag],
        runId: data.run?.runId,
        harvestDate: data.run?.createdAt,
        name: s.displayName ?? handle,
        handle,
        categoryGuess: s.detectedCategory,
        locationGuess: s.detectedLocation,
        bestMatchUrl: r.bestMatchUrl,
        bestMatchPlatform: r.bestMatchPlatform,
        bestMatchConf: r.confidence ? Math.round(r.confidence) : null,
        evidence: s.evidence ?? [],
        validationStatus: "new",
        status: "new",
        createdAt: now,
        updatedAt: now,
      },
      update: {
        vertical: "salon",
        name: s.displayName ?? handle,
        bestMatchUrl: r.bestMatchUrl,
        bestMatchConf: r.confidence ? Math.round(r.confidence) : null,
        updatedAt: now,
      },
    });
    n++;
  }
  console.log(JSON.stringify({ seeded: n, runId: data.run?.runId }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
