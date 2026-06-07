// scripts/test-sola.ts

import { scrapeSolaLocation } from "@/lib/operators/sources/sola/scrape-sola-location";

async function main() {
  const result = await scrapeSolaLocation("lafayette");

  console.log("Sola Lafayette scrape");
  console.log("sourceUrl:", result.sourceUrl);
  if (result.error) console.log("error:", result.error);
  console.log("listings found:", result.listings.length);
  console.log("JSON API hits:", result.apiHits.length);
  console.log("\nFirst 5 listings:");
  console.log(JSON.stringify(result.listings.slice(0, 5), null, 2));
  console.log("\nFirst 5 API endpoint URLs:");
  result.apiHits.slice(0, 5).forEach((hit, index) => {
    console.log(`${index + 1}. ${hit.url} (${hit.status})`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
