import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Library · Invites",
};

/** Legacy route — template editing lives in Template Library. */
export default function AdminInvitesTemplatesPage() {
  redirect("/admin/invites/offers");
}
