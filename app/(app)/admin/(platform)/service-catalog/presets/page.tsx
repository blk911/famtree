import type { Metadata } from "next";
import { ServicePresetAdminClient } from "@/components/vmb/admin/ServicePresetAdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Preset Cards",
};

export default function AdminServicePresetCardsPage() {
  return <ServicePresetAdminClient />;
}
