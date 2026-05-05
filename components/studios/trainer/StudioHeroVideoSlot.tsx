"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { STUDIOS_CARD_SHADOW, STUDIOS_LINE } from "@/lib/studios/visual";

type Props = {
  videoSrc: string;
  thumbSrc: string;
  foldImageUrl: string;
  modalTitle: string;
  overlayPrimary: string;
  overlaySecondary?: string | null;
  badgeLabel?: string | null;
  /** Shown in cinema error state — filesystem path hint */
  expectedFileHint: string;
  thumbPlayAriaLabel: string;
  cinemaAriaLabel: string;
};

/** Hero cinema clip: thumbnail + tap opens fullscreen modal (shared owner + testimonial flows). */
export function StudioHeroVideoSlot({
  videoSrc,
  thumbSrc,
  foldImageUrl,
  modalTitle,
  overlayPrimary,
  overlaySecondary,
  badgeLabel,
  expectedFileHint,
  thumbPlayAriaLabel,
  cinemaAriaLabel,
}: Props) {
  const modalTitleId = useId();
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [cinemaNonce, setCinemaNonce] = useState(0);
  const [cinemaMediaError, setCinemaMediaError] = useState(false);
  const cinemaVideoRef = useRef<HTMLVideoElement>(null);
  const cinemaAutoPlayDoneRef = useRef(false);

  const closeCinema = useCallback(() => {
    cinemaVideoRef.current?.pause();
    setCinemaOpen(false);
    setCinemaMediaError(false);
  }, []);

  const openCinema = useCallback(() => {
    cinemaAutoPlayDoneRef.current = false;
    setCinemaMediaError(false);
    setCinemaNonce((n) => n + 1);
    setCinemaOpen(true);
  }, []);

  useEffect(() => {
    if (!cinemaOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cinemaOpen]);

  useEffect(() => {
    if (!cinemaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCinema();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinemaOpen, closeCinema]);

  const tryPlayCinema = useCallback(() => {
    const v = cinemaVideoRef.current;
    if (!v || cinemaAutoPlayDoneRef.current) return;
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return;
    cinemaAutoPlayDoneRef.current = true;
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
    v.muted = true;
    void v.play().catch(() => {
      cinemaAutoPlayDoneRef.current = false;
    });
  }, []);

  useLayoutEffect(() => {
    if (!cinemaOpen) return;
    tryPlayCinema();
  }, [cinemaOpen, cinemaNonce, tryPlayCinema]);

  return (
    <>
      <div
        className="relative w-full max-w-[280px] overflow-hidden rounded-3xl border bg-black"
        style={{
          aspectRatio: "16 / 15",
          borderColor: STUDIOS_LINE,
          boxShadow: STUDIOS_CARD_SHADOW,
        }}
      >
        <video
          src={thumbSrc}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
          aria-hidden
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            try {
              v.currentTime = 0.001;
            } catch {
              /* ignore */
            }
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[0] bg-cover bg-center opacity-[0.12]"
          style={{ backgroundImage: `url(${foldImageUrl})` }}
        />
        <button
          type="button"
          onClick={openCinema}
          className="group absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-t from-black/55 via-black/15 to-black/25 transition hover:from-black/65 hover:via-black/25 hover:to-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={thumbPlayAriaLabel}
        >
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-stone-900 shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-[3px] ring-white/35 transition group-hover:scale-[1.04] group-active:scale-[0.98]">
            <ChevronRight className="h-8 w-8 translate-x-px" strokeWidth={2.75} aria-hidden />
          </span>
          <span className="max-w-[14rem] px-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
            {overlayPrimary}
          </span>
          {overlaySecondary ? (
            <span className="max-w-[13rem] px-3 text-center text-[9px] font-medium italic leading-snug text-white/85 drop-shadow-md">
              {overlaySecondary}
            </span>
          ) : null}
        </button>
        {badgeLabel ? (
          <span className="pointer-events-none absolute left-2 top-2 z-[4] rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 backdrop-blur-sm">
            {badgeLabel}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
      </div>

      {cinemaOpen ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/78 p-3 backdrop-blur-[10px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCinema();
          }}
        >
          <div
            className="animate-studio-intro-pop relative w-full max-w-[min(960px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.58)] ring-2 ring-white/18"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-stone-950 to-stone-900 px-4 py-3">
              <p id={modalTitleId} className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/95">
                {modalTitle}
              </p>
              <button
                type="button"
                onClick={closeCinema}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close video"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="relative bg-black">
              {cinemaMediaError ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-white">Video didn&apos;t load</p>
                  <p className="max-w-md text-xs leading-relaxed text-stone-400">
                    Expected file{" "}
                    <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-stone-200">
                      {expectedFileHint}
                    </code>{" "}
                    — check the path, filename, and that the MP4 is committed or present on the server.
                  </p>
                </div>
              ) : (
                <video
                  key={cinemaNonce}
                  ref={cinemaVideoRef}
                  src={videoSrc}
                  controls
                  playsInline
                  preload="auto"
                  className="max-h-[min(72vh,calc(100vw-48px))] w-full object-contain sm:max-h-[min(78vh,720px)]"
                  aria-label={cinemaAriaLabel}
                  onLoadedMetadata={tryPlayCinema}
                  onLoadedData={tryPlayCinema}
                  onCanPlay={tryPlayCinema}
                  onError={() => {
                    setCinemaMediaError(true);
                    cinemaAutoPlayDoneRef.current = false;
                  }}
                />
              )}
              <p className="border-t border-white/10 bg-stone-950/95 px-4 py-2 text-center text-[10px] leading-snug text-stone-400">
                Starts muted for autoplay — unmute in controls · replay from the hero thumbnail anytime.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
