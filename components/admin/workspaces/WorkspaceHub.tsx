import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WorkspaceSection } from "@/lib/admin/workspace-routes";

type Props = {
  title: string;
  description: string;
  sections: WorkspaceSection[];
};

export function WorkspaceHub({ title, description, sections }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {title ? (
        <header className="space-y-1">
          <h1 className="m-0 text-xl font-extrabold text-stone-900 sm:text-2xl">{title}</h1>
          {description ? (
            <p className="m-0 max-w-3xl text-sm leading-relaxed text-stone-600">{description}</p>
          ) : null}
        </header>
      ) : null}

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h2 className="m-0 text-sm font-extrabold text-stone-900">{section.title}</h2>
            {section.description ? (
              <p className="m-0 mt-0.5 text-xs text-stone-500">{section.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {section.links.map((link) => {
              const cardClass = [
                "group flex flex-col rounded-lg border p-3 no-underline shadow-sm transition-colors",
                link.comingSoon
                  ? "cursor-default border-dashed border-stone-200 bg-stone-50"
                  : link.legacy
                    ? "border-amber-200 bg-amber-50/40 hover:border-amber-300"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
              ].join(" ");

              const inner = (
                <>
                  <span className="flex items-center gap-2 text-xs font-extrabold text-stone-900">
                    {link.label}
                    {link.legacy ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                        Legacy
                      </span>
                    ) : null}
                    {link.comingSoon ? (
                      <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                        Soon
                      </span>
                    ) : null}
                    {link.external ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900">
                        Product
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex-1 text-[11px] leading-snug text-stone-500">
                    {link.description}
                  </span>
                  {!link.comingSoon ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 group-hover:text-rose-950">
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  ) : null}
                </>
              );

              if (link.comingSoon) {
                return (
                  <div key={`${section.title}-${link.label}`} className={cardClass} id={link.href.split("#")[1]}>
                    {inner}
                  </div>
                );
              }

              return (
                <Link
                  key={`${section.title}-${link.href}`}
                  href={link.href}
                  className={cardClass}
                  prefetch={false}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
