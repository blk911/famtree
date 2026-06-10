import type { Metadata } from "next";
import { VmbNetworkView } from "@/components/vmb/VmbNetworkView";

export const metadata: Metadata = {
  title: "Network",
};

export default function VmbNetworkPage() {
  return <VmbNetworkView />;
}
