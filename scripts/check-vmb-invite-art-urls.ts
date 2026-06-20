/**
 * npm run test:vmb:invite-art-urls
 */
import { inviteArtLibrary } from "../lib/vmb/assets";

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
  const failures: string[] = [];

  console.log("assetId | category | status | url");
  for (const asset of inviteArtLibrary.filter((row) => row.active)) {
    const status = await checkUrl(asset.imageUrl);
    console.log(`${asset.id} | ${asset.category} | ${status} | ${asset.imageUrl}`);
    if (status < 200 || status >= 400) {
      failures.push(`${asset.id} (${status})`);
    }
  }

  assert(failures.length === 0, `broken invite art URLs: ${failures.join(", ")}`);
  console.log("OK: all invite art URLs reachable");
}

void run();
