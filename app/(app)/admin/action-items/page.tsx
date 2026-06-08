// app/(app)/admin/action-items/page.tsx

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";

export const dynamic = "force-dynamic";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function AdminActionItemsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  return (
    <MarketIntelPageShell>
      <MarketIntelChrome showVerticalFilters={false} showDiscoveryFlow={false} />

      <h1 className="m-0 mb-1 text-xl font-extrabold text-stone-900 sm:text-[22px]">Action Items</h1>
      <p className="m-0 text-sm text-stone-500">Action Items coming soon</p>
    </MarketIntelPageShell>
  );
}
