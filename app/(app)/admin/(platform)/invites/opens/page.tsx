import { InvitesPlaceholderPanel } from "@/components/admin/workspaces/InvitesPlaceholderPanel";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export const dynamic = "force-dynamic";

export default function AdminInvitesOpensPage() {
  return (
    <div>
      <InvitesWorkspaceBreadcrumb current="Opens" />
      <InvitesPlaceholderPanel
        title="Open tracking"
        description="Track when invites are opened or viewed across delivery channels."
        plannedSignals={[
          "First open and last open timestamps",
          "Delivery channel and device class",
          "Correlation to template and offer variant",
        ]}
      />
    </div>
  );
}
