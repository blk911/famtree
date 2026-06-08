// scripts/debug-sola-profile-api.ts

import {
  fetchSolaProfileApi,
  readProfileApiEndpointCache,
} from "@/lib/operators/sources/sola/fetch-sola-profile-api";

async function main(): Promise<void> {
  const profileUrl = process.argv[2]?.trim();
  if (!profileUrl) {
    console.error("Usage: npm run debug:sola:profile -- <profileUrl>");
    process.exit(1);
  }

  const cache = await readProfileApiEndpointCache();
  const cacheKey = profileUrl.toLowerCase();
  const knownEndpoint = cache[cacheKey] ?? cache[profileUrl];

  const result = await fetchSolaProfileApi(profileUrl, knownEndpoint);
  const socialCount = result.parsed.socialLinks.length;

  const output = {
    profileUrl: result.profileUrl,
    endpointAttempted: result.endpointUrl ?? result.apiEndpoint ?? knownEndpoint ?? null,
    apiStatus: result.apiStatus,
    durationMs: result.durationMs,
    phoneCount: result.parsed.phones.length,
    bookingLinkCount: result.parsed.bookingLinks.length,
    socialCount,
    error: result.error ?? null,
    errorType: result.errorType ?? null,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
