import { DiscoveryInputsSection } from "@/components/admin/intelligence/salon/DiscoveryInputsSection";
import { WorkspaceHub } from "@/components/admin/workspaces/WorkspaceHub";
import { SalonPipelineOverview } from "@/app/(app)/admin/studios/SalonPipelineOverview";
import { DISCOVERY_WORKSPACE_SECTIONS } from "@/lib/admin/workspace-routes";

export const dynamic = "force-dynamic";

export default function AdminDiscoveryWorkspacePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-2xl">Discovery</h1>
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-stone-600">
          Source intake, resolver pipeline, dedupe, ranking, and run visibility. All engines live in{" "}
          <code className="text-xs">lib/intelligence/salon</code> — this workspace links into existing
          tools without duplicating parsers or harvesters.
        </p>
      </header>

      <SalonPipelineOverview />
      <DiscoveryInputsSection />
      <WorkspaceHub title="" description="" sections={DISCOVERY_WORKSPACE_SECTIONS} />
    </div>
  );
}
