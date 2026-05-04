"use client";

/** Thin progress strip — completed segments fill left-to-right; tap jumps to section. */
export function StudioLiteStepRail({
  steps,
  onStepClick,
}: {
  steps: readonly { id: string; label: string; href: string; complete: boolean }[];
  onStepClick: (href: string) => void;
}) {
  const done = steps.filter((s) => s.complete).length;
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div className="border-b border-stone-200/90 bg-[#fafaf8]/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1100px] px-4 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Studio setup</p>
          <p className="text-[10px] font-semibold text-stone-600">{pct}%</p>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-stone-200/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepClick(s.href)}
              className={
                s.complete
                  ? "rounded-full bg-emerald-600/15 px-3 py-1 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-600/25 transition hover:bg-emerald-600/22"
                  : "rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-stone-600 ring-1 ring-stone-200/90 transition hover:bg-stone-50"
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
