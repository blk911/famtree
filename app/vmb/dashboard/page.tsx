import type { Metadata } from "next";
import { VmbDashboardView } from "@/components/vmb/VmbDashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function VmbDashboardPage() {
  return <VmbDashboardView />;
}
