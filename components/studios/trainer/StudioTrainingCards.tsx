"use client";

const STUDIO_TRAINING_CARDS = [
  {
    title: "RUN STRONGER",
    text: "We refine your form, pacing, and endurance so every mile builds real performance—not just fatigue.",
    image: "/images/runner.jpg",
  },
  {
    title: "BUILD STRENGTH",
    text: "Structured lifting with clean technique and progressive load—strength that actually translates.",
    image: "/images/strength.jpg",
  },
  {
    title: "RIDE HARD",
    text: "High-intensity cycling sessions designed to push output, stamina, and recovery thresholds.",
    image: "/images/cycling.jpg",
  },
  {
    title: "RECOVER RIGHT",
    text: "Mobility, stretch, and recovery work that keeps your body durable, balanced, and ready.",
    image: "/images/stretch.jpg",
  },
] as const;

export function StudioTrainingCards({ className }: { className?: string }) {
  return (
    <div className={`min-w-0 space-y-3 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-900">BUILD REAL PERFORMANCE</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STUDIO_TRAINING_CARDS.map((card) => (
          <div key={card.title} className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/[0.05]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static assets in /public */}
            <img src={card.image} alt={card.title} className="aspect-square w-full object-cover" />
            <div className="p-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-900">{card.title}</div>
              <div className="mt-1 text-[11px] leading-tight text-neutral-600">{card.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
