"use client";

import type { SyntheticEvent } from "react";
import { StudiosGatewayAwareLink } from "@/components/studios/gateway/StudiosGatewayRoot";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { FEATURED_STUDIO_VIDEO_CARDS } from "@/lib/studios/landing/studioStackData";
import { StudiosHeroVideoLightbox } from "@/components/studios/landing/StudiosHeroVideoLightbox";
import { STUDIOS_LANDING_HERO_INTRO } from "@/lib/studios/studioIntroVideo";
import { GAP_U_CARD_THUMB_SRC } from "@/lib/studios/gapu/gapuStudioConfig";

type Props = { children: ReactNode };

const HERO_FOCUS = FEATURED_STUDIO_VIDEO_CARDS.find((c) => c.id === "gap-u")!;

/** Compact Gap U hero card: thin cinematic thumb + play opens lightbox; Enter Gap U keeps gateway routing. */
export function StudiosHeroFeaturedStudios({ children }: Props) {
  const [videoLightboxOpen, setVideoLightboxOpen] = useState(false);
  const [heroVideoBroken, setHeroVideoBroken] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const probeRef = useRef<HTMLVideoElement>(null);
  const posterCapturedRef = useRef(false);

  const heroIntroSrc = STUDIOS_LANDING_HERO_INTRO.videoSrc;

  useEffect(() => {
    posterCapturedRef.current = false;
    setPosterDataUrl(null);
    setHeroVideoBroken(false);
    probeRef.current?.load();
  }, [heroIntroSrc]);

  function capturePosterFrame(v: HTMLVideoElement) {
    if (posterCapturedRef.current) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      posterCapturedRef.current = true;
      setPosterDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    } catch {
      /* decode / canvas */
    }
  }

  function onProbeLoadedData(ev: SyntheticEvent<HTMLVideoElement>) {
    const v = ev.currentTarget;
    setHeroVideoBroken(false);

    const onSeekedOnce = () => {
      capturePosterFrame(v);
      v.removeEventListener("seeked", onSeekedOnce);
    };

    v.addEventListener("seeked", onSeekedOnce);
    requestAnimationFrame(() => {
      try {
        v.pause();
        const d =
          typeof v.duration === "number" && Number.isFinite(v.duration) && v.duration > 0
            ? Math.min(0.12, Math.max(0.02, v.duration * 0.02))
            : 0.04;
        v.currentTime = d;
      } catch {
        capturePosterFrame(v);
      }
    });
  }

  // Static thumbnail — always show the uploaded preview image instead of a canvas-captured frame.
  const STUDIO_INTRO_THUMB_SRC = "/uploads/STUDIO%20Intro%20Vid%20Thumb.png";
  const thumbBackdrop = STUDIO_INTRO_THUMB_SRC;

  return (
    <>
      <style>{`
        .shfs-twocol {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(14px, 3vw, 22px);
          align-items: start;
          width: 100%;
          max-width: min(1120px, 100%);
          margin: 0 auto;
        }
        @media (min-width: 880px) {
          .shfs-twocol {
            grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
          }
        }
        .shfs-copy { min-width: 0; text-align: center; }
        @media (min-width: 880px) { .shfs-copy { text-align: left; } }
        .shfs-video-wrap {
          min-width: 0;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .shfs-shell {
          width: min(380px, 100%);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(28, 25, 23, 0.065);
          box-shadow:
            0 8px 24px rgba(28, 25, 23, 0.06),
            0 1px 4px rgba(28, 25, 23, 0.04);
        }
        .shfs-probe-video {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          padding: 0;
          border: 0;
          overflow: hidden;
          clip: rect(0 0 0 0);
          opacity: 0;
          pointer-events: none;
        }
        .shfs-thumb-slot {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10.25;
          background:
            radial-gradient(circle at 50% 30%, rgba(255,255,255,0.06), transparent 55%),
            #161412;
          overflow: hidden;
        }
        .shfs-thumb-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
        }
        .shfs-thumb-hit {
          position: absolute;
          inset: 0;
          cursor: pointer;
          border: none;
          margin: 0;
          padding: 0;
          display: block;
          background: transparent;
        }
        .shfs-thumb-hit:disabled { cursor: not-allowed; opacity: 0.65; }
        .shfs-thumb-hit:focus-visible {
          outline: 2px solid rgba(157, 23, 77, 0.55);
          outline-offset: 2px;
        }
        .shfs-thumb-plate { position: absolute; inset: 0; }
        .shfs-thumb-dim {
          position: absolute;
          inset: 0;
          background: rgba(28, 25, 23, 0.18);
          pointer-events: none;
          transition: background 0.15s ease;
        }
        .shfs-thumb-hit:hover:not(:disabled) .shfs-thumb-dim {
          background: rgba(28, 25, 23, 0.1);
        }
        .shfs-thumb-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: transform 0.15s ease;
        }
        .shfs-thumb-hit:hover:not(:disabled) .shfs-thumb-play {
          transform: scale(1.06);
        }
        .shfs-thumb-play-ring {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          color: rgba(253, 252, 251, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }
        .shfs-feature-meta { padding: 10px 12px 12px; }
        .shfs-feature-title {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.022em;
          color: #1c1917;
        }
        .shfs-feature-sub {
          margin: 0 0 10px;
          font-size: 11px;
          line-height: 1.43;
          color: #78716c;
        }
        .shfs-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .shfs-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.14s ease;
          line-height: 1.2;
        }
        .shfs-btn:hover { transform: translateY(-1px); }
        .shfs-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }
        .shfs-btn-why {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(28, 25, 23, 0.14);
          color: #292524;
        }
        .shfs-btn-live {
          background: #9d174d;
          border: 1px solid rgba(157, 23, 77, 0.3);
          color: #fff;
        }
        .shfs-hero-video-fallback {
          margin: 8px 0 0;
          font-size: 10px;
          line-height: 1.4;
          color: #92400e;
          font-weight: 600;
        }
        .shfs-hero-video-fallback a { color: #b45309; font-weight: 800; }
        @media (prefers-reduced-motion: reduce) {
          .shfs-btn:hover,
          .shfs-thumb-hit:hover:not(:disabled) .shfs-thumb-play {
            transform: none !important;
          }
        }
      `}</style>

      {!heroVideoBroken && heroIntroSrc ? (
        <video
          key={heroIntroSrc}
          ref={probeRef}
          className="shfs-probe-video"
          src={heroIntroSrc}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden
          onLoadedData={onProbeLoadedData}
          onError={(ev) => {
            console.error("[StudiosHeroFeaturedStudios] probe failed", {
              code: ev.currentTarget.error?.code,
              src: heroIntroSrc,
            });
            setHeroVideoBroken(true);
          }}
        />
      ) : null}

      <div className="shfs-twocol">
        <div className="shfs-copy">{children}</div>
        <div className="shfs-video-wrap">
          <article
            className="shfs-shell"
            aria-label="Gap U featured reel"
            style={{ cursor: "pointer" }}
            onClick={() => { if (heroIntroSrc && !heroVideoBroken) setVideoLightboxOpen(true); }}
          >
            <div className="shfs-thumb-slot">
              <button
                type="button"
                className="shfs-thumb-hit"
                disabled={!heroIntroSrc || heroVideoBroken}
                aria-label="Play Gap U intro video"
                onClick={() => setVideoLightboxOpen(true)}
              >
                <span className="shfs-thumb-plate">
                  {thumbBackdrop ? (
                    <img className="shfs-thumb-media" src={thumbBackdrop} alt="" aria-hidden />
                  ) : (
                    <span aria-hidden style={{ position: "absolute", inset: 0, background: "#161412" }} />
                  )}
                </span>
                <span className="shfs-thumb-dim" aria-hidden />
                <span className="shfs-thumb-play" aria-hidden>
                  <span className="shfs-thumb-play-ring">
                    <Play style={{ width: 22, height: 22 }} fill="currentColor" />
                  </span>
                </span>
              </button>
            </div>
            <div className="shfs-feature-meta">
              <h2 className="shfs-feature-title">Why Gap University?</h2>
              <p className="shfs-feature-sub">{HERO_FOCUS.subcopy}</p>
              <div className="shfs-actions">
                <button
                  type="button"
                  className="shfs-btn shfs-btn-why"
                  disabled={!heroIntroSrc || heroVideoBroken}
                  onClick={() => setVideoLightboxOpen(true)}
                >
                  Here is the "Why"! <Play style={{ width: 13, height: 13 }} fill="currentColor" aria-hidden />
                </button>
                {/* Stop propagation so navigation doesn't also open the video */}
                <span onClick={(e) => e.stopPropagation()}>
                  <StudiosGatewayAwareLink
                    href={HERO_FOCUS.exploreHref}
                    prefetch={false}
                    actionLabel="Enter Gap U"
                    className="shfs-btn shfs-btn-live"
                    scroll
                  >
                    Enter Gap U <ArrowUpRight style={{ width: 13, height: 13 }} aria-hidden />
                  </StudiosGatewayAwareLink>
                </span>
              </div>
              {heroVideoBroken ? (
                <p className="shfs-hero-video-fallback">
                  Preview unavailable. Try{" "}
                  <a href={heroIntroSrc} target="_blank" rel="noreferrer noopener">
                    opening the MP4
                  </a>{" "}
                  · <code>{heroIntroSrc}</code>
                </p>
              ) : null}
            </div>
          </article>
        </div>
      </div>

      <StudiosHeroVideoLightbox
        open={videoLightboxOpen}
        onClose={() => setVideoLightboxOpen(false)}
        videoSrc={heroIntroSrc}
      />
    </>
  );
}
