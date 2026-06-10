import type { Metadata } from "next";
import { VmbClientsView } from "@/components/vmb/VmbClientsView";

export const metadata: Metadata = {
  title: "Clients",
};

export default function VmbClientsPage() {
  return <VmbClientsView />;
}
