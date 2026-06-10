import type { Metadata } from "next";
import { VmbRevenueView } from "@/components/vmb/VmbRevenueView";

export const metadata: Metadata = {
  title: "Revenue",
};

export default function VmbRevenuePage() {
  return <VmbRevenueView />;
}
