import { InvitesPlaceholderPanel } from "@/components/admin/workspaces/InvitesPlaceholderPanel";
import { InvitesWorkspaceBreadcrumb } from "@/components/admin/workspaces/InvitesWorkspaceBreadcrumb";

export const dynamic = "force-dynamic";

export default function AdminInvitesClaimsPage() {
  return (
    <div>
      <InvitesWorkspaceBreadcrumb current="Claims" />
      <InvitesPlaceholderPanel
        title="Claims tracking"
        description="Surface when clients tap card CTAs — Join Private Client Network, Book Refresh, and other auto-generated actions."
        plannedSignals={[
          "Claim event timestamp and card template type",
          "Client identity and salon trial linkage",
          "CTA label and channel (email, SMS, in-app)",
        ]}
      />
    </div>
  );
}
