import type { Metadata } from "next";
import { VmbOpportunitiesView } from "@/components/vmb/VmbOpportunitiesView";

export const metadata: Metadata = {
  title: "Opportunities",
};

export default function VmbOpportunitiesPage() {
  return <VmbOpportunitiesView />;
}
