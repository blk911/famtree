"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Play, X } from "lucide-react";
import { useStudiosGateway } from "@/components/studios/gateway/StudiosGatewayRoot";
import type { StudioStackCardData } from "@/lib/studios/landing/studioStackData";
import { isProtectedStudiosHref } from "@/lib/studios/gateway/protected-urls";
import { STUDIO_BUILDER_WIZARD_HREF } from "@/lib/studios/publishedSpaceBridge";

type Props = {
  card: StudioStackCardData;
  onClose: () => void;
};

export function StudioPreviewModal({ card, onClose }: Props) {
  const gw = useStudiosGateway();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    videoRef.current?.pause();
  }, [card.id]);

  const buildHref = `${STUDIO_BUILDER_WIZARD_HREF}?template=${encodeURIComponent(card.templateType)}`;
  const builderRoot = STUDIO_BUILDER_WIZARD_HREF;

  function guardedCta(opts: {
    href: string;
    actionLabel: string;
    className: string;
    children: ReactNode;
    closePreviewAfterGo?: boolean;
  }) {
    const { href, actionLabel, className, closePreviewAfterGo } = opts;
    if (gw?.interceptProtected && isProtectedStudiosHref(href)) {
      return (
        <button
          type="button"
          className={className}
          onClick={() => {
            gw.openAccessRequest(actionLabel, href);
            onClose();
          }}
        >
          {opts.children}
        </button>
      );
    }
    return (
      <Link
        href={href}
        className={className}
        onClick={() => {
          if (closePreviewAfterGo !== false) onClose();
        }}
      >
        {opts.children}
      </Link>
    );
  }

  return createPortal(
    <>
      <style>{`
        .spm-backdrop {
          position: fixed;
          inset: 0;
          z-index: 420;
          background: rgba(28, 25, 23, 0.55);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .spm-panel {
          width: 100%;
          max-width: min(720px, calc(100vw - 32px));
          max-height: min(90vh, 820px);
          overflow: auto;
          border-radius: 20px;
          background: linear-gradient(165deg, #fafaf9 0%, #f5f2ea 48%, #efe9df 100%);
          border: 1px solid rgba(28, 25, 23, 0.1);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.22);
        }
        .spm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(28, 25, 23, 0.08);
          background: rgba(255, 255, 255, 0.65);
        }
        .spm-eyebrow {
          margin: 0 0 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a8a29e;
        }
        .spm-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #1c1917;
        }
        .spm-close {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(28, 25, 23, 0.12);
          background: #fff;
          color: #44403c;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spm-body {
          display: grid;
          gap: 0;
        }
        @media (min-width: 640px) {
          .spm-body { grid-template-columns: 1fr 1fr; }
        }
        .spm-media { background: #1c1917; min-height: 200px; }
        .spm-video-wrap { position: relative; aspect-ratio: 16 / 10; }
        .spm-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .spm-video-hint {
          position: absolute;
          bottom: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(245, 242, 234, 0.9);
          background: rgba(0, 0, 0, 0.45);
        }
        .spm-image {
          width: 100%;
          aspect-ratio: 16 / 10;
          background-size: cover;
          background-position: center;
        }
        .spm-copy { padding: 18px 20px 22px; }
        .spm-sub { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #57534e; line-height: 1.45; }
        .spm-summary { margin: 0 0 14px; font-size: 14px; color: #78716c; line-height: 1.55; }
        .spm-live {
          margin: 0 0 16px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px dashed rgba(28, 25, 23, 0.12);
          list-style: none;
          font-size: 12px;
          color: #78716c;
        }
        .spm-live li { margin-bottom: 4px; }
        .spm-ctas { display: flex; flex-direction: column; gap: 8px; }
        .spm-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }
        .spm-cta-primary { background: #44403c; color: #fafaf9; }
        .spm-cta-secondary { background: #fff; color: #44403c; border: 1px solid rgba(28, 25, 23, 0.14); }
        .spm-cta-ghost { color: #57534e; }
      `}</style>
      <div
        role="presentation"
        className="spm-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-preview-modal-title"
          className="spm-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="spm-header">
            <div>
              <p className="spm-eyebrow">
                Live preview · <span style={{ letterSpacing: "0.06em", color: "#78716c" }}>{card.videoLabel}</span>
              </p>
              <h2 id="studio-preview-modal-title" className="spm-title">
                {card.title}
              </h2>
            </div>
            <button type="button" className="spm-close" aria-label="Close" onClick={onClose}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </header>

          <div className="spm-body">
            <div className="spm-media">
              {card.videoSrc ? (
                <div className="spm-video-wrap">
                  <video
                    ref={videoRef}
                    src={card.videoSrc}
                    poster={card.foldImageUrl}
                    controls
                    playsInline
                    muted
                    preload="metadata"
                    className="spm-video"
                  />
                  <span className="spm-video-hint">
                    <Play style={{ width: 14, height: 14 }} aria-hidden />
                    Tap play for sound
                  </span>
                </div>
              ) : (
                <div
                  className="spm-image"
                  style={{ backgroundImage: `url(${card.foldImageUrl})` }}
                  role="img"
                  aria-label={card.title}
                />
              )}
            </div>

            <div className="spm-copy">
              <p className="spm-sub">{card.subcopy}</p>
              <p className="spm-summary">{card.summary}</p>

              {(card.liveActivityLabel || card.memberCountLabel || card.announcementPreview) && (
                <ul className="spm-live" aria-label="Community signals (preview)">
                  {card.liveActivityLabel ? <li>{card.liveActivityLabel}</li> : null}
                  {card.memberCountLabel ? <li>{card.memberCountLabel}</li> : null}
                  {card.announcementPreview ? <li>{card.announcementPreview}</li> : null}
                </ul>
              )}

              <div className="spm-ctas">
                {guardedCta({
                  href: card.exploreHref,
                  actionLabel: "Explore live Studio",
                  className: "spm-cta spm-cta-primary",
                  children: (
                    <>
                      Explore live Studio <ArrowRight style={{ width: 14, height: 14 }} />
                    </>
                  ),
                })}
                {guardedCta({
                  href: buildHref,
                  actionLabel: "Clone this Studio",
                  className: "spm-cta spm-cta-secondary",
                  children: "Clone this Studio",
                  closePreviewAfterGo: false,
                })}
                {guardedCta({
                  href: builderRoot,
                  actionLabel: "Build your own",
                  className: "spm-cta spm-cta-ghost",
                  children: "Build your own",
                  closePreviewAfterGo: false,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
