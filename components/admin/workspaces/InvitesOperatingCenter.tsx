import Link from "next/link";
import { INVITES_HUB_COMING_LATER, INVITES_HUB_SECONDARY_LINKS } from "@/lib/admin/invites-workspace";

/** Secondary links panel — primary Invites nav routes to Template Builder directly. */
export function InvitesOperatingCenter() {
  return (
    <div className="vmb-invites-hub">
      <header className="vmb-invites-hub__header">
        <h1 className="vmb-invites-hub__title">Invites</h1>
        <p className="vmb-invites-hub__lead">
          Quick links to library, outreach, and invite operations.
        </p>
      </header>

      <nav className="vmb-invites-hub__secondary" aria-label="Invite admin links">
        {INVITES_HUB_SECONDARY_LINKS.map((link, index) => (
          <span key={link.id} className="vmb-invites-hub__secondary-item">
            {index > 0 ? (
              <span className="vmb-invites-hub__secondary-sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            <Link href={link.href} className="vmb-invites-hub__secondary-link">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>

      <p className="vmb-invites-hub__coming-later">
        <span className="vmb-invites-hub__coming-later-label">Coming later:</span>{" "}
        {INVITES_HUB_COMING_LATER.map((link, index) => (
          <span key={link.id}>
            {index > 0 ? ", " : null}
            <Link href={link.href} className="vmb-invites-hub__coming-later-link">
              {link.label}
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}
