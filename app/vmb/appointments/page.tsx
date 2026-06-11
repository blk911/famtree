import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const metadata: Metadata = {
  title: "Appointments",
};

type Props = {
  searchParams: Promise<{ analysis?: string }>;
};

export default async function VmbAppointmentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({ analysisId: params.analysis?.trim() });
  return (
    <VmbPlaceholderPage
      title="Calendar"
      purpose="Open appointment windows and fill options from your client book."
      context={ctx}
    />
  );
}
