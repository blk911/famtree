import type { Metadata } from "next";
import { VmbNetworkClient } from "@/components/vmb/VmbNetworkClient";

export const metadata: Metadata = {
  title: "Network",
};

export default function VmbNetworkPage() {
  return <VmbNetworkClient />;
}
