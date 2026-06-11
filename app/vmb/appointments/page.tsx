import type { Metadata } from "next";
import { VmbPlaceholderPage } from "@/components/vmb/VmbPlaceholderPage";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function VmbAppointmentsPage() {
  return <VmbPlaceholderPage title="Appointments" />;
}
