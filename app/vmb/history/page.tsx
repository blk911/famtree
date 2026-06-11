import type { Metadata } from "next";
import { VmbHistoryClient } from "@/components/vmb/VmbHistoryClient";

export const metadata: Metadata = {
  title: "History",
};

export default function VmbHistoryPage() {
  return <VmbHistoryClient />;
}
