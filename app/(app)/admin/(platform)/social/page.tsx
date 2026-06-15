import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { SOCIAL_WORKSPACE_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminSocialWorkspacePage() {
  return (
    <WorkspaceHub
      title="Social"
      description="Salon-owned Instagram and social connections. Auth, ingest status, and publishing hooks are placeholders — resolved social URLs and IG backfill reuse the Discovery pipeline engines."
      sections={SOCIAL_WORKSPACE_SECTIONS}
    />
  );
}
