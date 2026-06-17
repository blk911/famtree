import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Invites workspace entry — routes directly to Template Builder. */
export default function AdminInvitesWorkspacePage() {
  redirect("/admin/invites/builder");
}
