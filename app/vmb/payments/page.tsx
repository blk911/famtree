import type { Metadata } from "next";
import { VmbPaymentsStubClient } from "@/components/vmb/VmbPaymentsStubClient";

export const metadata: Metadata = {
  title: "Payments",
};

export default function VmbPaymentsPage() {
  return <VmbPaymentsStubClient />;
}
