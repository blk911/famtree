import type { Metadata } from "next";
import { VmbClientsClient } from "@/components/vmb/VmbClientsClient";

export const metadata: Metadata = {
  title: "Client Opportunities",
};

export default function VmbClientsPage() {
  return <VmbClientsClient />;
}
