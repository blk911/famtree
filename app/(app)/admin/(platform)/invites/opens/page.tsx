import { InvitesEventsAdminPanel } from "@/components/admin/workspaces/InvitesEventsAdminPanel";
import { inviteEventTypesForAdminPanel } from "@/lib/vmb/invites/invite-event-types";

export const dynamic = "force-dynamic";

export default function AdminInvitesOpensPage() {
  return (
    <InvitesEventsAdminPanel
      breadcrumb="Opens"
      title="Open tracking"
      description="Track when invites are opened or viewed across delivery channels."
      eventTypes={inviteEventTypesForAdminPanel("opens")}
      emptyMessage="No open events recorded yet for this trial."
    />
  );
}
