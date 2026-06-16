import type { Metadata } from "next";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";
import { OutreachMessagesAdminClient } from "@/components/vmb/admin/OutreachMessagesAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Outreach Messages · Invites",
};

export default async function AdminInvitesOutreachPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-4 pt-2 sm:px-6 lg:px-8">
        <InvitesWorkspaceBreadcrumb current="Outreach Messages" />
      </div>
      <OutreachMessagesAdminClient salonName={ctx.salonName} />
    </>
  );
}
