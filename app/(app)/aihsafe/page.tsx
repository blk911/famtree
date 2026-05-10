// AIH Safe — governed social layer. Server component.
// Agent 15: Founder shell · Agent 21: Role-aware presentation (founder / member / child).

export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { buildActorContext } from "@/lib/aihsafe/context/buildActorContext";
import { RoleAwareFamilySafePage } from "@/components/aihsafe/roles/RoleAwareFamilySafePage";
import { asAIHUserId } from "@/types/aihsafe/ids";

export const metadata = { title: "Family Safe · AMIHUMAN.NET" };

export default async function AihSafePage() {
  const user = await requireAuth();
  const actor = await buildActorContext(asAIHUserId(user.id));
  return <RoleAwareFamilySafePage actor={actor} currentUserId={user.id} />;
}
