import type { Metadata } from "next";
import { PlatformServiceCatalogClient } from "@/components/vmb/admin/PlatformServiceCatalogClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Catalog",
};

export default function AdminServiceCatalogPage() {
  return <PlatformServiceCatalogClient />;
}
