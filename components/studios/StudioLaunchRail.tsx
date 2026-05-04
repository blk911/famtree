"use client";

export type LaunchStepId = "identity" | "story" | "offers" | "proof" | "launch";

export type LaunchStepStatus = "incomplete" | "active" | "complete" | "needs-attention";

const LABELS: Record<LaunchStepId, string> = {
  identity: "Identity",
  story: "Story",
  offers: "Offers",
  proof: "Proof",
  launch: "Launch",
};

const ORDER: LaunchStepId[] = ["identity", "story", "offers", "proof", "launch"];

export function StudioLaunchRail({
  activeStep,
  stepStatus,
  onStepClick,
}: {
  activeStep: LaunchStepId;
  stepStatus: Record<LaunchStepId, LaunchStepStatus>;
  onStepClick: (id: LaunchStepId) => void;
}) {
  return (
    <nav
      aria-label="Studio setup steps"
      className="sticky top-0 z-50 border-b border-stone-200/90 bg-[#fafaf8]/98 px-3 py-3 shadow-sm backdrop-blur-md md:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2">
          {ORDER.map((id, idx) => {
            const st = stepStatus[id];
            const isActive = activeStep === id;
            const ring =
              st === "complete"
                ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                : st === "needs-attention"
                  ? "border-amber-400 bg-amber-50 text-amber-950"
                  : isActive
                    ? "border-sky-500 bg-sky-50 text-sky-950"
                    : "border-stone-200 bg-white text-stone-600";
            return (
              <button
                key={id}
                type="button"
                onClick={() => onStepClick(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition hover:opacity-95 sm:px-3 sm:text-[11px] ${ring}`}
              >
                <span className="tabular-nums opacity-70">{idx + 1}</span>
                {LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
