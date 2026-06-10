import type { Metadata } from "next";
import { VmbCampaignsView } from "@/components/vmb/VmbCampaignsView";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function VmbCampaignsPage() {
  return <VmbCampaignsView />;
}
