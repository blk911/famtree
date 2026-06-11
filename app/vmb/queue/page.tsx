import type { Metadata } from "next";
import { VmbQueueCenterClient } from "@/components/vmb/VmbQueueCenterClient";

export const metadata: Metadata = {
  title: "Queue",
};

export default function VmbQueuePage() {
  return <VmbQueueCenterClient />;
}
