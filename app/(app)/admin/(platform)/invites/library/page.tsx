import type { Metadata } from "next";
import { NailsLibraryAdminClient } from "@/components/vmb/admin/NailsLibraryAdminClient";
import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nails Library · Invites",
};

type Props = {
  searchParams: Promise<{ template?: string }>;
};

export default async function AdminInvitesLibraryPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = await loadVmbPageContext({});
  return (
    <NailsLibraryAdminClient
      salonId={ctx.trialId}
      salonName={ctx.salonName}
      ownerName={ctx.workspace?.ownerName}
      initialTemplateId={params.template}
    />
  );
}
