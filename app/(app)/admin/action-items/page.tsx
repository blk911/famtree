// app/(app)/admin/action-items/page.tsx

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MarketIntelNav } from "@/components/admin/MarketIntelNav";

export const dynamic = "force-dynamic";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export default async function AdminActionItemsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.role)) redirect("/dashboard");

  return (
    <div style={{ padding: "28px 20px 60px", maxWidth: 1320, margin: "0 auto" }}>
      <MarketIntelNav />

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Action Items</h1>
      <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>Action Items coming soon</p>
    </div>
  );
}
