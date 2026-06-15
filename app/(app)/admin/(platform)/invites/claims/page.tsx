import { InvitesEventsAdminPanel } from "@/components/admin/workspaces/InvitesEventsAdminPanel";
import { inviteEventTypesForAdminPanel } from "@/lib/vmb/invites/invite-event-types";

export const dynamic = "force-dynamic";

export default function AdminInvitesClaimsPage() {
  return (
    <InvitesEventsAdminPanel
      breadcrumb="Claims"
      title="Claims tracking"
      description="Surface when clients tap card CTAs — Join Private Client Network, Book Refresh, and other auto-generated actions."
      eventTypes={inviteEventTypesForAdminPanel("claims")}
      emptyMessage="No claim events recorded yet for this trial."
    />
  );
}
