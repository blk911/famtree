import Link from "next/link";
import { ArrowRight } from "lucide-react";

const INPUT_CARDS = [
  {
    title: "Source URL",
    description: "Paste a directory or provider URL to scan into candidates.",
    href: "/admin/studios/source-ingest",
    action: "Open Source URL",
  },
  {
    title: "Hashtag Harvest",
    description: "Discover operators from Instagram hashtag searches.",
    href: "/admin/studios/creator-lab/hashtag-harvest",
    action: "Start harvest",
  },
  {
    title: "GG Seed",
    description: "Run GlossGenius seed discovery and directory intake.",
    href: "/admin/studios/ggen-discovery",
    action: "Open GG Seed",
  },
  {
    title: "Back Office Import",
    description: "Import salon back-office records into the pipeline.",
    href: "/admin/intelligence/salon/backoffice",
    action: "Open import",
  },
] as const;

export function DiscoveryInputsSection() {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="m-0 text-sm font-extrabold text-stone-900">How do I start?</h2>
        <p className="m-0 mt-0.5 text-xs text-stone-500">
          Pick an input source to feed the discovery pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {INPUT_CARDS.map(({ title, description, href, action }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-lg border border-stone-200 bg-white p-3 no-underline shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <span className="text-xs font-extrabold text-stone-900">{title}</span>
            <span className="mt-1 flex-1 text-[11px] leading-snug text-stone-500">{description}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 group-hover:text-rose-950">
              {action}
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
