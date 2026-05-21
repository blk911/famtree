"use client";

import {
  HOW_STUDIOS_STEPS,
  HOW_STUDIOS_WORK_SECTION,
} from "@/lib/studios/communityPlatformCopy";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

/** Four-step onboarding flow (replaces Private Client Feedback). */
export function StudioHowStudiosWorkSection({ className }: { className?: string }) {
  return (
    <section
      id={HOW_STUDIOS_WORK_SECTION.id}
      className={`scroll-mt-24 ${className ?? ""}`}
      style={{ marginBottom: "40px" }}
    >
      <h2
        style={{
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 700,
          color: STUDIOS_INK,
          margin: "0 0 8px",
          letterSpacing: "-0.3px",
        }}
      >
        {HOW_STUDIOS_WORK_SECTION.title}
      </h2>
      <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
        {HOW_STUDIOS_WORK_SECTION.subtitle}
      </p>
      <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_STUDIOS_STEPS.map(({ step, title, text }) => (
          <li
            key={step}
            className="flex flex-col rounded-[20px] border bg-white p-5"
            style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
          >
            <span
              className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "#78716c" }}
              aria-hidden
            >
              {step}
            </span>
            <h3 className="m-0 text-[16px] font-bold text-stone-900" style={{ color: STUDIOS_INK }}>
              {title}
            </h3>
            <p className="mb-0 mt-2 flex-1 text-[14px] leading-relaxed text-stone-600">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
