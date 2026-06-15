import Link from "next/link";
import { VMB_THEME } from "@/lib/vmb/theme";
import { buildRecipientInvitePath } from "@/lib/vmb/invites/recipient-invite-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ inviteId: string }>;
};

export default async function VmbRecipientInviteClaimPage({ params }: PageProps) {
  const { inviteId } = await params;

  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center"
      style={{ background: VMB_THEME.warmBg, color: VMB_THEME.ink }}
    >
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-stone-500">Coming soon</p>
      <h1 className="m-0 mt-2 text-2xl font-extrabold text-stone-900">Claim this invite</h1>
      <p className="m-0 mt-3 text-sm leading-relaxed text-stone-600">
        The claim flow is not live yet. Your salon will follow up when claiming opens.
      </p>
      <Link
        href={buildRecipientInvitePath(inviteId)}
        className="mt-6 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 no-underline hover:bg-white"
      >
        Back to invite
      </Link>
    </main>
  );
}
