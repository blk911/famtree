"use client";

const PLACEHOLDER_TESTIMONIALS = [
  {
    name: "Maya R.",
    text: "The structure helped me stay consistent without feeling overwhelmed.",
  },
  {
    name: "Lauren T.",
    text: "I finally understood what to work on between sessions.",
  },
  {
    name: "Chris D.",
    text: "The coaching felt specific, practical, and easy to follow.",
  },
  {
    name: "Anika S.",
    text: "The mobility work changed how my runs felt within two weeks.",
  },
  {
    name: "Jordan P.",
    text: "The strength sessions were simple, focused, and effective.",
  },
  {
    name: "Elena M.",
    text: "I loved having video guidance I could revisit anytime.",
  },
  {
    name: "Priya K.",
    text: "Clear programming, better form, and no wasted time.",
  },
  {
    name: "Sam W.",
    text: "The balance of training and recovery made the biggest difference.",
  },
] as const;

export function StudioTestimonialScroller() {
  return (
    <div
      className="-mx-1 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="region"
      aria-label="Client testimonials"
      tabIndex={0}
    >
      <div className="flex snap-x snap-mandatory gap-4 px-1">
        {PLACEHOLDER_TESTIMONIALS.map((t) => (
          <blockquote
            key={t.name}
            className="flex min-h-[148px] min-w-[260px] snap-start flex-col rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.03]"
          >
            <p className="flex-1 text-sm leading-snug text-stone-700">{t.text}</p>
            <footer className="mt-3 border-t border-black/[0.05] pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {t.name}
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
