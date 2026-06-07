// app/(app)/admin/markets/sola/page.tsx

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SolaMarketClient } from "@/components/admin/markets/SolaMarketClient";
import { readSolaResolverImport } from "@/lib/operators/sources/sola/read-sola-resolver-import";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function SolaMarketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const artifact = await readSolaResolverImport();

  return <SolaMarketClient artifact={artifact} />;
}
