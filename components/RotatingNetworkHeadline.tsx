"use client";

import { useEffect, useState } from "react";

const WORDS = [
  { label: "SOCIAL", color: "text-[#EF476F]" },
  { label: "CLUB", color: "text-[#7B2CBF]" },
  { label: "CHURCH", color: "text-[#139A8F]" },
  { label: "BUSINESS", color: "text-[#006CFF]" },
  { label: "FAMILY", color: "text-[#D89200]" },
  { label: "PRIVATE", color: "text-[#15124A]" },
] as const;

export default function RotatingNetworkHeadline() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let t2: ReturnType<typeof setTimeout> | undefined;
    const hold = WORDS[index].label === "PRIVATE" ? 5000 : 1000;

    const t1 = setTimeout(() => {
      setLeaving(true);
      t2 = setTimeout(() => {
        setIndex((prev) => (prev + 1) % WORDS.length);
        setLeaving(false);
      }, 360);
    }, hold);

    return () => {
      clearTimeout(t1);
      if (t2 !== undefined) clearTimeout(t2);
    };
  }, [index]);

  const word = WORDS[index];

  return (
    <h1 className="mx-auto mb-[18px] w-full max-w-[min(100%,960px)] px-2 text-center font-black leading-[0.88] tracking-[-0.055em] text-[#15124A]">
      <div className="flex items-end justify-center whitespace-nowrap text-[clamp(4rem,9vw,8rem)]">
        <span className="shrink-0">Your</span>

        <span className="relative ml-[0.22em] inline-block h-[0.9em] w-[6.9em] shrink-0 overflow-hidden text-left">
          <span
            key={word.label}
            className={[
              "absolute bottom-0 left-0 block leading-[0.88]",
              "transition-all duration-[360ms] ease-out",
              leaving ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
              word.color,
            ].join(" ")}
          >
            {word.label}
          </span>
        </span>
      </div>

      <div className="mt-[0.08em] shrink-0 text-[clamp(4.5rem,10vw,9rem)] text-[#15124A]">
        Network.
      </div>
    </h1>
  );
}
