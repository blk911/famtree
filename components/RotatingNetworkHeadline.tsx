"use client";

import { useEffect, useState } from "react";

const words = [
  "BUSINESS",
  "FAMILY",
  "CHURCH",
  "CLUB",
  "SOCIAL",
  "PRIVATE",
] as const;

export default function RotatingNetworkHeadline() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    let innerTimer: ReturnType<typeof setTimeout> | undefined;
    const currentWord = words[index];
    const delay = currentWord === "PRIVATE" ? 5000 : 1000;

    const outerTimer = setTimeout(() => {
      setAnimate(false);
      innerTimer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setAnimate(true);
      }, 120);
    }, delay);

    return () => {
      clearTimeout(outerTimer);
      if (innerTimer !== undefined) clearTimeout(innerTimer);
    };
  }, [index]);

  const size = "text-[40px] min-[861px]:text-[72px] lg:text-[96px]";

  return (
    <h1 className="m-0 mb-[18px] flex w-full max-w-[min(100%,920px)] flex-wrap items-center justify-center px-2 text-center font-normal leading-none">
      <span className={`mr-2 min-[861px]:mr-4 ${size} font-black tracking-[-0.04em] text-[#1D1753]`}>
        Your
      </span>

      <span className="relative inline-block max-[860px]:h-[52px] min-[861px]:h-[88px] lg:h-[110px] overflow-hidden align-middle">
        <span
          className={`inline-block transform transition-all duration-500 ease-out ${
            animate ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <span
            className={`inline-block ${size} font-black tracking-[-0.04em] ${
              words[index] === "PRIVATE"
                ? "text-[#7CFF4F]"
                : "bg-gradient-to-r from-[#F8E16C] to-[#F5B6D6] bg-clip-text text-transparent"
            }`}
          >
            {words[index]}
          </span>
        </span>
      </span>

      <span className={`ml-2 min-[861px]:ml-4 ${size} font-black tracking-[-0.04em] text-[#1D1753]`}>
        Network.
      </span>
    </h1>
  );
}
