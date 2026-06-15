import { InvitesPlaceholderPanel } from "@/components/admin/workspaces/InvitesPlaceholderPanel";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export const dynamic = "force-dynamic";

export default function AdminInvitesConversionsPage() {
  return (
    <div>
      <InvitesWorkspaceBreadcrumb current="Conversions" />
      <InvitesPlaceholderPanel
        title="Conversion funnel"
        description="Attribute bookings and revenue back to invite campaigns, templates, and offers."
        plannedSignals={[
          "Invite → claim → booking progression",
          "Service and offer attached to converted visit",
          "Campaign and template performance rollups",
        ]}
      />
    </div>
  );
}
