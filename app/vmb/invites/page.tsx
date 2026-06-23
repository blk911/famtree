import type { Metadata } from "next";
import { Suspense } from "react";
import { VmbInvitesClient } from "@/components/vmb/VmbInvitesClient";
import { VmbTaikosDraftWorkspace } from "@/components/vmb/VmbTaikosDraftWorkspace";
import { VmbPageLoading } from "@/components/vmb/VmbPageFrame";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";
import { createVmbSalonSession } from "@/lib/vmb/salon-authority";

export const metadata: Metadata = {
  title: "Invitations",
};

type Props = {
  searchParams: Promise<{ analysis?: string; section?: string; draft?: string }>;
};

export default async function VmbInvitesPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });

  if (params.draft?.trim()) {
    return (
      <Suspense fallback={<VmbPageLoading label="Loading invite draft…" />}>
        <VmbTaikosDraftWorkspace
          workspace="invites"
          eyebrow="Invitations"
          title="Invitation drafts"
          subtitle="Saved PCN invites and referral asks from tAIkOS."
        />
      </Suspense>
    );
  }

  return (
    <VmbInvitesClient
      initialAnalysisId={ctx.activeAnalysisId ?? params.analysis?.trim()}
      initialSection={params.section?.trim()}
      salonName={ctx.salonName}
      salonId={ctx.trialId}
      salonToken={ctx.trialId ? createVmbSalonSession(ctx.trialId) : undefined}
    />
  );
}
