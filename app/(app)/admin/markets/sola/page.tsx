// app/(app)/admin/markets/sola/page.tsx

export const dynamic = "force-dynamic";

import { access, readFile } from "fs/promises";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SolaMarketClient } from "@/components/admin/markets/SolaMarketClient";
import {
  SOLA_REVIEWED_TARGETS_CSV_PATH,
  SOLA_REVIEWED_TARGETS_JSON_PATH,
} from "@/lib/operators/sources/sola/export-reviewed-targets";
import type { SolaReviewedTargetsArtifact } from "@/lib/operators/sources/sola/export-reviewed-targets";
import { readSolaResolverImport } from "@/lib/operators/sources/sola/read-sola-resolver-import";

const isAdmin = (role: string) => role === "founder" || role === "admin";

async function loadReviewedTargetsExportMeta(): Promise<{
  csvAvailable: boolean;
  jsonAvailable: boolean;
  exportedCount?: number;
}> {
  let csvAvailable = false;
  let jsonAvailable = false;
  let exportedCount: number | undefined;

  try {
    await access(SOLA_REVIEWED_TARGETS_CSV_PATH);
    csvAvailable = true;
  } catch {
    /* not generated yet */
  }

  try {
    const raw = await readFile(SOLA_REVIEWED_TARGETS_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as SolaReviewedTargetsArtifact;
    jsonAvailable = true;
    exportedCount = parsed.exportedCount;
  } catch {
    /* not generated yet */
  }

  return { csvAvailable, jsonAvailable, exportedCount };
}

export default async function SolaMarketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [artifact, reviewedTargetsExport] = await Promise.all([
    readSolaResolverImport(),
    loadReviewedTargetsExportMeta(),
  ]);

  return (
    <SolaMarketClient artifact={artifact} reviewedTargetsExport={reviewedTargetsExport} />
  );
}
