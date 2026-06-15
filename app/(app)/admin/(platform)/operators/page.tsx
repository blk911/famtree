import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { OPERATORS_WORKSPACE_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminOperatorsWorkspacePage() {
  return (
    <WorkspaceHub
      title="Operators"
      description="Canonical salon and operator records with booking provider links, social URLs, identity views, and resolver confidence / source evidence summaries."
      sections={OPERATORS_WORKSPACE_SECTIONS}
    />
  );
}
