import type { Metadata } from "next";
import { VmbCalendarClient } from "@/components/vmb/VmbCalendarClient";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function VmbAppointmentsPage() {
  return <VmbCalendarClient />;
}
