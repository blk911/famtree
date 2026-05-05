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

function TestimonialCard({ t }: { t: (typeof PLACEHOLDER_TESTIMONIALS)[number] }) {
  return (
    <blockquote className="flex h-full min-h-[148px] w-[260px] shrink-0 flex-col rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.03]">
      <p className="flex-1 text-sm leading-snug text-stone-700">{t.text}</p>
      <footer className="mt-3 border-t border-black/[0.05] pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {t.name}
      </footer>
    </blockquote>
  );
}

/**
 * Duplicated strip + CSS marquee so all 8 quotes stay visible and continuously move.
 * Hover pauses motion; respects prefers-reduced-motion.
 */
export function StudioTestimonialScroller() {
  return (
    <div
      className="relative min-h-[156px] w-full overflow-hidden py-1"
      role="region"
      aria-label="Client testimonials"
    >
      <div className="flex w-max animate-testimonial-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <div className="flex shrink-0 gap-4 pr-4">
          {PLACEHOLDER_TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
        <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
          {PLACEHOLDER_TESTIMONIALS.map((t) => (
            <TestimonialCard key={`dup-${t.name}`} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
