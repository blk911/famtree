import type { Metadata } from "next";
import { ServicePresetAdminClient } from "@/components/vmb/admin/ServicePresetAdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Preset Cards",
};

export default function AdminServicePresetCardsPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <ServicePresetAdminClient />
    </div>
  );
}
