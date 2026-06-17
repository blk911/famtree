import Link from "next/link";

export type AdminNailBuilderStep = "services" | "offers" | "templates";

const STEPS: { id: AdminNailBuilderStep; label: string; href: string }[] = [
  { id: "services", label: "Services", href: "/admin/service-catalog" },
  { id: "offers", label: "Offers", href: "/admin/invites/offers" },
  { id: "templates", label: "Templates", href: "/admin/invites/templates" },
];

type Props = {
  active: AdminNailBuilderStep;
};

export function AdminNailBuilderFlowNav({ active }: Props) {
  return (
    <nav className="vmb-admin-nail-builder-flow-nav" aria-label="Nail builder flow">
      {STEPS.map((step, index) => (
        <span key={step.id} className="vmb-admin-nail-builder-flow-nav__item">
          {index > 0 ? (
            <span className="vmb-admin-nail-builder-flow-nav__sep" aria-hidden="true">
              →
            </span>
          ) : null}
          {step.id === active ? (
            <span className="vmb-admin-nail-builder-flow-nav__current">{step.label}</span>
          ) : (
            <Link href={step.href} className="vmb-admin-nail-builder-flow-nav__link">
              {step.label}
            </Link>
          )}
        </span>
      ))}
      <span className="vmb-admin-nail-builder-flow-nav__item">
        <span className="vmb-admin-nail-builder-flow-nav__sep" aria-hidden="true">
          →
        </span>
        <span className="vmb-admin-nail-builder-flow-nav__hint">Final Card</span>
      </span>
    </nav>
  );
}
