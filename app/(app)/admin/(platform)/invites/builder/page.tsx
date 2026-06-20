import type { Metadata } from "next";

import { TemplateBuilderAdminClient } from "@/components/vmb/admin/TemplateBuilderAdminClient";

import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";



export const dynamic = "force-dynamic";



export const metadata: Metadata = {

  title: "Nails Template Builder · Invites",

};



type Props = {

  searchParams: Promise<{ template?: string }>;

};



export default async function AdminInvitesBuilderPage({ searchParams }: Props) {

  const params = await searchParams;

  const ctx = await loadVmbPageContext({});

  return (

    <TemplateBuilderAdminClient

      salonId={ctx.trialId}

      salonName={ctx.salonName}

      ownerName={ctx.workspace?.ownerName}

      initialTemplateId={params.template}

    />

  );

}

