import type { Metadata } from "next";
import { PlatformServiceCatalogClient } from "@/components/vmb/admin/PlatformServiceCatalogClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Catalog",
};

export default function AdminServiceCatalogPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <PlatformServiceCatalogClient />
    </div>
  );
}
