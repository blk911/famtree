import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nails Library · Invites",
};

/** Legacy route — redirects to Nails Library. */
export default function AdminInvitesOffersPage() {
  redirect("/admin/invites/library");
}
