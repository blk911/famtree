import type { Metadata } from "next";

import { LegacyAdminPathNotice } from "@/components/admin/workspaces/LegacyAdminPathNotice";

import { TemplateBuilderAdminClient } from "@/components/vmb/admin/TemplateBuilderAdminClient";

import { createVmbSalonSession } from "@/lib/vmb/salon-authority";

import { loadVmbPageContext } from "@/lib/vmb/load-vmb-page-context";



export const dynamic = "force-dynamic";



export const metadata: Metadata = {

  title: "Nails Template Builder (legacy)",

};



/** @deprecated Use /admin/invites/builder — VMB product shell compatibility route. */

export default async function VmbAdminTemplatesPage() {

  const ctx = await loadVmbPageContext({});

  return (

    <>

      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">

        <LegacyAdminPathNotice

          legacyPath="/vmb/admin/templates"

          canonicalPath="/admin/invites/builder"

          label="Nails template builder"

        />

      </div>

      <TemplateBuilderAdminClient

        salonId={ctx.trialId}

        targetSalonToken={ctx.trialId ? createVmbSalonSession(ctx.trialId) : undefined}

        salonName={ctx.salonName}

        ownerName={ctx.workspace?.ownerName}

      />

    </>

  );

}
