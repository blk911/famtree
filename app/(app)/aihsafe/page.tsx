// AIH Safe — governed social layer. Server component.
// Renders the relationship-first family command center (Agent 14 layout).

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { RelationalDashboard } from "@/components/aihsafe/dashboard/RelationalDashboard";

export const metadata = { title: "Family Safe · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user = await requireAuth();
  return <RelationalDashboard currentUserId={user.id} />;
}
