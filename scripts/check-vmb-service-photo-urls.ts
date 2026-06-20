/**
 * npm run test:vmb:service-photo-urls
 */
import { servicePhotoLibrary } from "../lib/vmb/assets/service-photo-library";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function checkUrl(url: string): Promise<number> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (head.ok) return head.status;
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return get.status;
  } catch {
    return 0;
  }
}

async function run(): Promise<void> {
  const hostnames = new Set<string>();
  const failures: string[] = [];

  console.log("assetId | category | status | url");
  for (const asset of servicePhotoLibrary.filter((row) => row.active)) {
    hostnames.add(new URL(asset.imageUrl).hostname);
    const status = await checkUrl(asset.imageUrl);
    console.log(`${asset.id} | ${asset.category} | ${status} | ${asset.imageUrl}`);
    if (status < 200 || status >= 400) {
      failures.push(`${asset.id} (${status})`);
    }
  }

  console.log("\nUnique hostnames:", [...hostnames].sort().join(", "));
  assert(failures.length === 0, `broken asset URLs: ${failures.join(", ")}`);
  console.log("OK: all service photo URLs reachable");
}

void run();
