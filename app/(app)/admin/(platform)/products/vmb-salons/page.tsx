import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { VMB_SALONS_PRODUCT_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminVmbSalonsProductPage() {
  return (
    <WorkspaceHub
      title="VMB Salons"
      description="Product-specific salon onboarding, campaign readiness, and operator dashboards. Discovery, resolver, and social ingestion live under Platform workspaces — not duplicated here."
      sections={VMB_SALONS_PRODUCT_SECTIONS}
    />
  );
}
