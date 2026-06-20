import type { Metadata } from "next";

import { redirect } from "next/navigation";



export const dynamic = "force-dynamic";



export const metadata: Metadata = {

  title: "Nails Template Builder · Invites",

};



/** Legacy route — redirects to Template Builder. */

export default function AdminInvitesTemplatesPage() {

  redirect("/admin/invites/builder");

}

