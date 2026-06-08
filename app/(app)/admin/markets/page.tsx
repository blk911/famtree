// app/(app)/admin/markets/page.tsx

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MarketsHub } from "@/components/admin/markets/MarketsHub";
import { readMarketCandidatesArtifact } from "@/lib/markets/read-market-candidates";
import { loadSolaMarketsHubStats } from "@/lib/operators/sources/sola/markets-hub-stats";

export const dynamic = "force-dynamic";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function AdminMarketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [solaStats, registry] = await Promise.all([
    loadSolaMarketsHubStats(),
    readMarketCandidatesArtifact(),
  ]);

  return <MarketsHub solaStats={solaStats} registry={registry} />;
}
