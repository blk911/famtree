import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function VmbAppointmentsPage() {
  return (
    <VmbPlaceholderPage
      title="Appointments"
      description="Open appointment windows and fill options will live here. For now, review weekly openings from Home."
    />
  );
}
