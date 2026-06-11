import type { Metadata } from "next";
import { Suspense } from "react";
import { VmbTaikosDraftWorkspace } from "@/components/vmb/VmbTaikosDraftWorkspace";
import { VmbPageLoading } from "@/components/vmb/VmbPageFrame";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function VmbCampaignsPage() {
  return (
    <Suspense fallback={<VmbPageLoading label="Loading campaign drafts…" />}>
      <VmbTaikosDraftWorkspace
        workspace="campaigns"
        eyebrow="Campaigns"
        title="Campaign drafts"
        subtitle="Saved campaigns, reactivation messages, and calendar opportunities from tAIkOS."
      />
    </Suspense>
  );
}
