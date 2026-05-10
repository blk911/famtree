// AIH Safe — governed social layer. Server component.
// Agent 15: Founder / Guardian Shell — steward-first governance UX.

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { FounderShell } from "@/components/aihsafe/founder/FounderShell";

export const metadata = { title: "Family Safe · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user = await requireAuth();
  return <FounderShell currentUserId={user.id} />;
}
