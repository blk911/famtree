import Link from "next/link";
import {
  INVITES_BUILDER_HUB,
  INVITES_HUB_COMING_LATER,
  INVITES_HUB_SECONDARY_LINKS,
} from "@/lib/admin/invites-workspace";

export function InvitesOperatingCenter() {
  return (
    <div className="vmb-invites-hub">
      <header className="vmb-invites-hub__header">
        <h1 className="vmb-invites-hub__title">Invites</h1>
        <p className="vmb-invites-hub__lead">
          Create the message, attach an offer or image, and preview the final card clients will see.
        </p>
      </header>

      <section className="vmb-invites-hub__primary" aria-labelledby="invites-builder-heading">
        <div className="vmb-invites-hub__workbench">
          <h2 id="invites-builder-heading" className="vmb-invites-hub__workbench-title">
            {INVITES_BUILDER_HUB.title}
          </h2>
          <p className="vmb-invites-hub__workbench-desc">{INVITES_BUILDER_HUB.description}</p>
          <Link href={INVITES_BUILDER_HUB.href} className="taikos-opp-card__cta vmb-invites-hub__cta">
            Open Invite Builder
          </Link>
        </div>
      </section>

      <nav className="vmb-invites-hub__secondary" aria-label="Secondary invite admin links">
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
