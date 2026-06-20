import { InvitesEventsAdminPanel } from "@/components/admin/workspaces/InvitesEventsAdminPanel";

import { inviteEventTypesForAdminPanel } from "@/lib/vmb/invites/invite-event-types";



export const dynamic = "force-dynamic";



export default function AdminInvitesConversionsPage() {

  return (

    <InvitesEventsAdminPanel

      breadcrumb="Conversions"

      title="Conversion funnel"

      description="Attribute bookings and revenue back to invite campaigns, templates, and offers."

      eventTypes={inviteEventTypesForAdminPanel("conversions")}

      emptyMessage="No conversion or booking events recorded yet for this trial."

    />

  );

}

