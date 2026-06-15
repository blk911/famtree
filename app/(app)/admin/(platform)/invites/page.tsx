import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { INVITES_WORKSPACE_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminInvitesWorkspacePage() {
  return (
    <WorkspaceHub
      title="Invites"
      description="Card templates, offer and service catalogs, invite queues, preview surfaces, and future claims/conversion analytics."
      sections={INVITES_WORKSPACE_SECTIONS}
    />
  );
}
