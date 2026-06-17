import Link from "next/link";

export type AdminBuilderStep = "services" | "library";

const STEPS: { id: AdminBuilderStep; label: string; href: string }[] = [
  { id: "services", label: "Services", href: "/admin/service-catalog" },
  { id: "library", label: "Template Library", href: "/admin/invites/offers" },
];

type Props = {
  active: AdminBuilderStep;
};

export function AdminBuilderFlowNav({ active }: Props) {
  return (
    <nav className="vmb-admin-builder-flow-nav" aria-label="Admin builder flow">
      {STEPS.map((step, index) => (
        <span key={step.id} className="vmb-admin-builder-flow-nav__item">
          {index > 0 ? (
            <span className="vmb-admin-builder-flow-nav__sep" aria-hidden="true">
              →
            </span>
          ) : null}
          {step.id === active ? (
            <span className="vmb-admin-builder-flow-nav__current">{step.label}</span>
          ) : (
            <Link href={step.href} className="vmb-admin-builder-flow-nav__link">
              {step.label}
            </Link>
          )}
        </span>
      ))}
      <span className="vmb-admin-builder-flow-nav__item">
        <span className="vmb-admin-builder-flow-nav__sep" aria-hidden="true">
          →
        </span>
        <span className="vmb-admin-builder-flow-nav__hint">Preview</span>
      </span>
    </nav>
  );
}
