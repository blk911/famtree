import Link from "next/link";
import { VMB_CLIENT_INVITE_WORKBENCH } from "@/lib/vmb/invites/client-invite-workbench";

export const dynamic = "force-dynamic";

export default function VmbClientInviteWorkbenchPage() {
  return (
    <main className="vmb-dev-client-invite">
      <section className="vmb-dev-client-invite__panel">
        <p className="vmb-dev-client-invite__eyebrow">VMB Client Invite Workbench</p>
        <h1>Deb&apos;s gift flow</h1>
        <p>
          Temporary access for building the client-side booking, personalization, hold, calendar, and payment path.
          This uses a real sent invite record and then opens the same client invite page Deb will use later.
        </p>

        <dl className="vmb-dev-client-invite__facts">
          <div>
            <dt>Client</dt>
            <dd>{VMB_CLIENT_INVITE_WORKBENCH.clientEmail}</dd>
          </div>
          <div>
            <dt>Salon</dt>
            <dd>{VMB_CLIENT_INVITE_WORKBENCH.salonName}</dd>
          </div>
          <div>
            <dt>Invite</dt>
            <dd>Birthday Celebration · Gel-X Extensions</dd>
          </div>
        </dl>

        <div className="vmb-dev-client-invite__actions">
          <Link href="/api/vmb/client-invites/workbench">
            Open Deb Invite
          </Link>
          <Link href="/api/vmb/client-invites/workbench?fresh=1">
            Fresh Deb Invite
          </Link>
        </div>

        <p className="vmb-dev-client-invite__note">
          This skips the admin/salon setup loop only for workbench speed. The opened page still uses the real client
          invite lookup, save, personalize, hold, and booking-request endpoints.
        </p>
      </section>
    </main>
  );
}
