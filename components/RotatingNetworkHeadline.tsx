"use client";

import { useEffect, useState } from "react";

const words = [
  { label: "SOCIAL", color: "text-[#E94B6A]" },
  { label: "CLUB", color: "text-[#7B3FC8]" },
  { label: "CHURCH", color: "text-[#159A8C]" },
  { label: "BUSINESS", color: "text-[#0067E8]" },
  { label: "FAMILY", color: "text-[#D49300]" },
  { label: "PRIVATE", color: "text-[#15124A]" },
] as const;

export default function RotatingNetworkHeadline() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const isPrivate = words[index].label === "PRIVATE";
    const holdTime = isPrivate ? 5000 : 1000;

    const holdTimer = setTimeout(() => {
      setLeaving(true);
      swapTimer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setLeaving(false);
      }, 420);
    }, holdTime);

    return () => {
      clearTimeout(holdTimer);
      if (swapTimer !== undefined) clearTimeout(swapTimer);
    };
  }, [index]);

  const current = words[index];

  return (
    <h1 className="mx-auto mb-[18px] flex w-full max-w-[min(100%,960px)] items-baseline justify-center whitespace-nowrap px-2 text-center text-[clamp(3.8rem,8vw,7.6rem)] font-black leading-[0.88] tracking-[-0.055em] text-[#15124A]">
      <span className="shrink-0">Your</span>

      <span className="relative mx-[0.22em] inline-block h-[0.92em] w-[7.1em] overflow-hidden align-baseline">
        <span
          key={current.label}
          className={[
            "absolute bottom-0 left-0 block w-full text-left font-black leading-[0.88] tracking-[-0.055em]",
            "transition-all duration-[420ms] ease-out will-change-transform",
            current.color,
            leaving ? "-translate-y-[115%] opacity-0" : "translate-y-0 opacity-100",
          ].join(" ")}
        >
          {current.label}
        </span>
      </span>

      <span className="shrink-0">Network.</span>
    </h1>
  );
}
