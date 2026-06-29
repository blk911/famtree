import type { Metadata } from "next";
import { VmbClientHome } from "@/components/vmb/client/VmbClientHome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VMB Client | Private salon gifts",
  description: "Open private salon gifts, book appointments, and manage your VMB client space.",
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function VmbClientPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return (
    <VmbClientHome
      inviteId={first(params.inviteId)}
      contact={first(params.contact)}
      token={first(params.token)}
    />
  );
}
