import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { MEMBERS_WORKSPACE_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminMembersWorkspacePage() {
  return (
    <WorkspaceHub
      title="Members"
      description="Invited clients, incomplete profiles, invite relationships, and future referral graph surfaces. Salon member views link into the VMB product shell."
      sections={MEMBERS_WORKSPACE_SECTIONS}
    />
  );
}
