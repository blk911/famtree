import { VmbClientInvitePortal } from "@/components/vmb/client/VmbClientInvitePortal";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function VmbClientInvitePage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return (
    <VmbClientInvitePortal
      inviteId={first(params.inviteId)}
      contact={first(params.contact)}
    />
  );
}
