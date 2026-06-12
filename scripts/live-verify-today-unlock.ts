/**
 * Live HTTP verification: trial → analyze book.c → full-flow → Today/Clients/Opportunities
 * Usage: npx tsx scripts/live-verify-today-unlock.ts [baseUrl]
 */
import { readFileSync } from "fs";

const BASE = process.argv[2]?.replace(/\/$/, "") ?? "http://localhost:3000";
let cookie = "";

function absorbSetCookie(res: Response): void {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(";")[0]?.trim();
    if (!part) continue;
    const name = part.split("=")[0];
    if (!name) continue;
    const rest = cookie
      .split("; ")
      .filter((c) => c && !c.startsWith(`${name}=`));
    rest.push(part);
    cookie = rest.join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (single && !raw.length) {
    const part = single.split(";")[0]?.trim();
    if (part) {
      const name = part.split("=")[0];
      const rest = cookie.split("; ").filter((c) => c && !c.startsWith(`${name}=`));
      rest.push(part);
      cookie = rest.join("; ");
    }
  }
}

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  absorbSetCookie(res);
  return res;
}

async function main(): Promise<void> {
  const bookBytes = readFileSync("c:/dev/vmb/book.csv");
  const email = `live-verify-${Date.now()}@salon.test`;

  const trialRes = await req("/api/vmb/trial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      salonName: "Live Verify Salon",
      ownerName: "Live Tester",
      email,
      providerPlatform: "glossgenius",
    }),
  });
  const trialJson = (await trialRes.json()) as { ok: boolean; data?: { id: string } };
  if (!trialRes.ok || !trialJson.ok || !trialJson.data?.id) {
    throw new Error(`trial failed: ${trialRes.status} ${JSON.stringify(trialJson)}`);
  }
  const trialId = trialJson.data.id;
  console.log("trialId:", trialId);
  console.log("cookie after trial:", cookie ? "present" : "MISSING");

  const form = new FormData();
  form.append("trialId", trialId);
  form.append("salonName", "Live Verify Salon");
  form.append("providerPlatform", "glossgenius");
  form.append("file", new Blob([bookBytes], { type: "text/csv" }), "book.c");

  const analyzeRes = await req("/api/vmb/analyze-book", { method: "POST", body: form });
  const analyzeJson = (await analyzeRes.json()) as {
    ok: boolean;
    data?: { analysis: { analysisId: string; recordCount: number } };
    error?: string;
  };
  if (!analyzeRes.ok || !analyzeJson.ok || !analyzeJson.data?.analysis) {
    throw new Error(`analyze failed: ${analyzeRes.status} ${JSON.stringify(analyzeJson)}`);
  }
  const analysisId = analyzeJson.data.analysis.analysisId;
  console.log("analysisId:", analysisId, "records:", analyzeJson.data.analysis.recordCount);

  const flowRes = await req("/api/vmb/debug/full-flow");
  const flowJson = (await flowRes.json()) as { ok: boolean; data?: unknown };
  console.log("\n=== /api/vmb/debug/full-flow ===");
  console.log(JSON.stringify(flowJson, null, 2));

  const todayRes = await req(`/vmb/today?analysis=${encodeURIComponent(analysisId)}`, {
    headers: { Accept: "text/html" },
  });
  const todayHtml = await todayRes.text();
  const todayLocked = todayHtml.includes("Connect your book to unlock Today");
  const todayUnlocked =
    todayHtml.includes("vmb-today") && !todayLocked && todayHtml.includes("Today");

  console.log("\n=== /vmb/today ===");
  console.log("status:", todayRes.status);
  console.log("Connect your book to unlock Today:", todayLocked);
  console.log("Today content (vmb-today):", todayHtml.includes("vmb-today"));

  const clientsRes = await req(`/vmb/clients?analysis=${encodeURIComponent(analysisId)}`, {
    headers: { Accept: "text/html" },
  });
  const clientsHtml = await clientsRes.text();
  const clientsLocked = clientsHtml.includes("Start by finding the money in your book");

  console.log("\n=== /vmb/clients ===");
  console.log("status:", clientsRes.status);
  console.log("Start by finding the money:", clientsLocked);

  const oppRes = await req(`/vmb/opportunities?analysis=${encodeURIComponent(analysisId)}`, {
    headers: { Accept: "text/html" },
  });
  const oppHtml = await oppRes.text();
  const oppLocked =
    oppHtml.includes("Start by finding the money") ||
    oppHtml.includes("Connect your book");

  console.log("\n=== /vmb/opportunities ===");
  console.log("status:", oppRes.status);
  console.log("locked empty state:", oppLocked);

  const pass =
    flowJson.ok &&
    todayRes.ok &&
    !todayLocked &&
    todayUnlocked &&
    clientsRes.ok &&
    !clientsLocked &&
    oppRes.ok &&
    !oppLocked;

  console.log("\n=== LIVE VERIFICATION ===");
  console.log(pass ? "PASS" : "FAIL");
  if (!pass) process.exit(1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
