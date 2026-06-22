import Link from "next/link";



export type AdminBuilderStep = "presets" | "services" | "builder" | "library";



const STEPS: { id: AdminBuilderStep; label: string; href: string }[] = [

  { id: "presets", label: "Manage Presets", href: "/admin/service-catalog/presets" },

  { id: "services", label: "Service Offers", href: "/admin/service-catalog" },

  { id: "builder", label: "Builder", href: "/admin/invites/builder" },

  { id: "library", label: "Library", href: "/admin/invites/library" },

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

    </nav>

  );

}

