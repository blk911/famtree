import type { Metadata } from "next";
import { CardTemplateAdminClient } from "@/components/vmb/admin/CardTemplateAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Templates",
};

export default async function VmbAdminTemplatesPage() {
  const ctx = await loadVmbPageContext({});
  return (
    <CardTemplateAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ctx.workspace?.ownerName}
    />
  );
}
