import Link from "next/link";
import { INVITES_ADMIN_ROUTES } from "@/lib/admin/invites-workspace";

type Props = {
  current: string;
};

export function InvitesWorkspaceBreadcrumb({ current }: Props) {
  return (
    <nav aria-label="Invites workspace" className="mb-4 text-[11px] text-stone-500">
      <Link href={INVITES_ADMIN_ROUTES.hub} className="font-semibold text-stone-600 no-underline hover:text-stone-900">
        Invites
      </Link>
      <span className="mx-1 text-stone-300">›</span>
      <span className="font-bold text-stone-800">{current}</span>
    </nav>
  );
}
