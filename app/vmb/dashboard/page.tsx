import type { Metadata } from "next";
import { VmbDashboardClient } from "@/components/vmb/VmbDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  return <VmbDashboardClient analysisId={params.analysis?.trim()} />;
}
