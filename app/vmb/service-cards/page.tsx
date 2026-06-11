import type { Metadata } from "next";
import { Suspense } from "react";
import { VmbTaikosDraftWorkspace } from "@/components/vmb/VmbTaikosDraftWorkspace";
import { VmbPageLoading } from "@/components/vmb/VmbPageFrame";

export const metadata: Metadata = {
  title: "Service Cards",
};

export default function VmbServiceCardsPage() {
  return (
    <Suspense fallback={<VmbPageLoading label="Loading service card drafts…" />}>
      <VmbTaikosDraftWorkspace
        workspace="service-cards"
        eyebrow="Service Cards"
        title="Service card drafts"
        subtitle="Saved service cards from tAIkOS — review, edit, and get ready to share later."
      />
    </Suspense>
  );
}
