"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronRight, X } from "lucide-react";

type Props = {
  videoSrc: string;
  thumbSrc: string;
  modalTitle: string;
  expectedFileHint: string;
  thumbAriaLabel: string;
};

/** Compact proof-card clip — metadata thumb + modal playback (no Instagram embed). */
export function StudioProofMiniVideo({
  videoSrc,
  thumbSrc,
  modalTitle,
  expectedFileHint,
  thumbAriaLabel,
}: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playedRef = useRef(false);

  const close = useCallback(() => {
    videoRef.current?.pause();
    setOpen(false);
    setMediaError(false);
  }, []);

  const openModal = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    playedRef.current = false;
    setMediaError(false);
    setNonce((n) => n + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || playedRef.current) return;
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return;
    playedRef.current = true;
    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
    v.muted = false;
    v.volume = 1;
    void v.play().catch(() => {
      playedRef.current = false;
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    tryPlay();
  }, [open, nonce, tryPlay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-black/[0.08] bg-black"
        style={{ aspectRatio: "16 / 10", maxHeight: "168px" }}
      >
        <video
          src={thumbSrc}
          playsInline
          preload="metadata"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
          aria-hidden
          onLoadedMetadata={(ev) => {
            const v = ev.currentTarget;
            try {
              v.currentTime = 0.001;
            } catch {
              /* ignore */
            }
          }}
        />
        <button
          type="button"
          onClick={openModal}
          className="group absolute inset-0 z-[2] flex items-center justify-center bg-gradient-to-t from-black/45 via-black/10 to-black/25 transition hover:from-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
          aria-label={thumbAriaLabel}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-900 shadow-lg ring-2 ring-white/40 transition group-hover:scale-105 group-active:scale-[0.98]">
            <ChevronRight className="h-6 w-6 translate-x-px" strokeWidth={2.5} aria-hidden />
          </span>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="relative w-full max-w-[min(920px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
              <p id={titleId} className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">
                {modalTitle}
              </p>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                aria-label="Close video"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {mediaError ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">Video didn&apos;t load</p>
                <p className="text-xs text-stone-400">
                  Expected{" "}
                  <code className="rounded bg-white/10 px-1 font-mono text-[11px]">{expectedFileHint}</code>
                </p>
              </div>
            ) : (
              <video
                key={nonce}
                ref={videoRef}
                src={videoSrc}
                controls
                playsInline
                preload="auto"
                className="max-h-[min(70vh,640px)] w-full bg-black object-contain"
                aria-label={modalTitle}
                onLoadedMetadata={tryPlay}
                onLoadedData={tryPlay}
                onCanPlay={tryPlay}
                onError={() => {
                  setMediaError(true);
                  playedRef.current = false;
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
