import type { Metadata } from "next";
import { VmbOpportunitiesCenterClient } from "@/components/vmb/VmbOpportunitiesCenterClient";

export const metadata: Metadata = {
  title: "Opportunities",
};

export default function VmbOpportunitiesPage() {
  return <VmbOpportunitiesCenterClient />;
}
