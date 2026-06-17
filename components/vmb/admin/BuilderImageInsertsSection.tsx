import type { SalonInviteImageInserts } from "@/lib/vmb/invites/salon-invite-image-inserts";

type Props = {
  inserts: SalonInviteImageInserts;
  onChange?: (inserts: SalonInviteImageInserts) => void;
};

const ROWS = [
  { key: "ownerPhotoUrl" as const, label: "Owner Photo", hint: "Future upload" },
  { key: "salonLogoUrl" as const, label: "Salon Logo", hint: "Future upload" },
  { key: "serviceImageUrl" as const, label: "Service Image", hint: "Future upload" },
];

export function BuilderImageInsertsSection({ inserts }: Props) {
  return (
    <section className="vmb-builder-image-inserts" aria-labelledby="builder-image-inserts-heading">
      <h3 id="builder-image-inserts-heading" className="vmb-builder-image-inserts__title">
        Image Inserts
      </h3>
      <ul className="vmb-builder-image-inserts__list">
        {ROWS.map((row) => (
          <li key={row.key} className="vmb-builder-image-inserts__row">
            <span className="vmb-builder-image-inserts__label">{row.label}</span>
            <div className="vmb-builder-image-inserts__placeholder" aria-hidden>
              {inserts[row.key] ? "Preview ready" : row.hint}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
