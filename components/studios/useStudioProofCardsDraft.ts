"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { StudioInstagramProofCard } from "@/lib/studios/studioProofCard";
import { sanitizeProofCard } from "@/lib/studios/studioProofCard";

/** Hydrates proof cards from localStorage (start shell only). No-op when `storageKey` is null. */
export function useStudioProofCardsDraft(
  initial: StudioInstagramProofCard[],
  storageKey: string | null,
): readonly [StudioInstagramProofCard[], Dispatch<SetStateAction<StudioInstagramProofCard[]>>] {
  const [cards, setCards] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    const seed = initialRef.current;

    if (!storageKey) {
      setCards(seed);
      queueMicrotask(() => {
        if (!cancelled) setHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          if (!cancelled) {
            setCards(parsed.map(sanitizeProofCard));
            setHydrated(true);
          }
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      /* ignore */
    }

    if (!cancelled) {
      setCards(seed);
      setHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cards));
    } catch {
      /* ignore */
    }
  }, [cards, hydrated, storageKey]);

  return [cards, setCards] as const;
}
