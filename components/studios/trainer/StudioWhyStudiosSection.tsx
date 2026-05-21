"use client";

import {
  WHY_STUDIOS_BENEFITS,
  WHY_STUDIOS_SECTION,
} from "@/lib/studios/communityPlatformCopy";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

/** Four benefit cards — operational value of the community platform (replaces Performance & Longevity). */
export function StudioWhyStudiosSection({ className }: { className?: string }) {
  return (
    <section
      id={WHY_STUDIOS_SECTION.id}
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
        {WHY_STUDIOS_SECTION.title}
      </h2>
      <p style={{ fontSize: "15px", color: STUDIOS_MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
        {WHY_STUDIOS_SECTION.subtitle}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WHY_STUDIOS_BENEFITS.map(({ title, text }) => (
          <article
            key={title}
            className="rounded-[20px] border bg-white p-5"
            style={{ borderColor: STUDIOS_LINE, boxShadow: STUDIOS_CARD_SHADOW }}
          >
            <h3 className="m-0 text-[17px] font-bold tracking-tight text-stone-900" style={{ color: STUDIOS_INK }}>
              {title}
            </h3>
            <p className="mb-0 mt-2 text-[15px] leading-relaxed text-stone-600">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
