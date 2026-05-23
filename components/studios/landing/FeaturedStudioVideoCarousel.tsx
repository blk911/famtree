"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  FEATURED_STUDIO_VIDEO_CARDS,
  type StudioStackCardData,
  type StudioStackCardId,
} from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";

const DEFAULT_ACTIVE_ID: StudioStackCardId = "private-client-network";

export function FeaturedStudioVideoCarousel() {
  const [activeId, setActiveId] = useState<StudioStackCardId>(DEFAULT_ACTIVE_ID);
  const [modalOpen, setModalOpen] = useState(false);
  const active = FEATURED_STUDIO_VIDEO_CARDS.find((c) => c.id === activeId)!;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.load();
  }, [activeId]);

  function openPreview() {
    setModalOpen(true);
  }

  return (
    <>
      <style>{`
        .fsvc {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 14px;
        }
        .fsvc-stage {
          flex: 1 1 auto;
          min-width: 0;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(28, 25, 23, 0.09);
          box-shadow: 0 12px 32px rgba(38, 38, 38, 0.1), 0 2px 8px rgba(38, 38, 38, 0.04);
        }
        .fsvc-media {
          width: 100%;
          aspect-ratio: 16 / 10;
          max-height: 260px;
          background: #1c1917;
          overflow: hidden;
          position: relative;
        }
        .fsvc-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #1c1917;
        }
        .fsvc-poster-fill {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.16;
          pointer-events: none;
        }
        .fsvc-meta {
          padding: 14px 16px 16px;
          text-align: left;
        }
        .fsvc-title {
          margin: 0 0 8px;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #1c1917;
        }
        .fsvc-sub {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.52;
          color: #78716c;
        }
        .fsvc-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .fsvc-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .fsvc-btn:hover {
          transform: translateY(-1px);
        }
        .fsvc-btn:active {
          transform: translateY(0);
        }
        .fsvc-btn-primary-solid {
          background: #292524;
          color: #fafaf9;
        }
        .fsvc-btn-primary-solid:hover {
          box-shadow: 0 10px 24px rgba(38, 38, 38, 0.2);
        }
        .fsvc-btn-live {
          background: #9d174d;
          border-color: rgba(157, 23, 77, 0.3);
          color: #fff;
        }
        .fsvc-btn-live:hover {
          box-shadow: 0 12px 28px rgba(157, 23, 77, 0.25);
        }
        .fsvc-btn-ghost {
          background: transparent;
          color: #44403c;
          border-color: rgba(28, 25, 23, 0.14);
        }
        .fsvc-thumbstrip {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 86px;
        }
        .fsvc-thumb {
          border: none;
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          background: #fff;
          display: flex;
          flex-direction: column;
          text-align: left;
          box-shadow: 0 8px 20px rgba(38, 38, 38, 0.08);
          outline-offset: 2px;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }
        .fsvc-thumb:not(.fsvc-thumb--active):hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(38, 38, 38, 0.12);
        }
        .fsvc-thumb-media {
          display: block;
          width: 100%;
          aspect-ratio: 3 / 4;
          background-size: cover;
          background-position: center;
        }
        .fsvc-thumb-label {
          display: block;
          padding: 6px 7px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1.26;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #57534e;
          background: #fafaf9;
        }
        .fsvc-thumb--active .fsvc-thumb-label {
          color: #1c1917;
        }

        @media (prefers-reduced-motion: reduce) {
          .fsvc-btn:hover,
          .fsvc-thumb:hover {
            transform: none !important;
          }
        }

        @media (max-width: 879px) {
          .fsvc {
            flex-direction: column;
          }
          .fsvc-media {
            max-height: 220px;
          }
          .fsvc-thumbstrip {
            flex-direction: row;
            gap: 10px;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-snap-type: x proximity;
            width: calc(100% + 16px);
            margin-left: -8px;
            padding: 8px;
            scrollbar-width: thin;
          }
          .fsvc-thumb {
            flex: 0 0 76px;
            scroll-snap-align: start;
          }
          .fsvc-thumb-media {
            aspect-ratio: 1 / 1.15;
          }
        }
      `}</style>

      <section className="fsvc" aria-label="Featured Studio video previews">
        <div className="fsvc-stage">
          <div className="fsvc-media">
            <span className="fsvc-poster-fill" style={{ backgroundImage: `url(${active.foldImageUrl})` }} />
            {active.videoSrc ? (
              <video
                key={active.id}
                ref={videoRef}
                src={active.videoSrc}
                poster={active.foldImageUrl}
                muted
                playsInline
                controls
                preload="metadata"
                aria-label={`Preview clip: ${active.videoLabel}`}
              />
            ) : (
              <div role="img" aria-label={active.title} style={posterOnlyStyle(active)} />
            )}
          </div>
          <div className="fsvc-meta">
            <p className="fsvc-title">{active.title}</p>
            <p className="fsvc-sub">{active.subcopy}</p>
            <div className="fsvc-actions">{renderActions(active, openPreview)}</div>
          </div>
        </div>

        <div className="fsvc-thumbstrip" role="tablist" aria-label="Choose Studio example preview">
          {FEATURED_STUDIO_VIDEO_CARDS.map((card) => {
            const selected = card.id === activeId;
            return (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`fsvc-thumb ${selected ? "fsvc-thumb--active" : ""}`}
                style={{
                  ...(selected
                    ? { boxShadow: `0 0 0 2px ${card.accent}` }
                    : undefined),
                }}
                aria-label={`Show ${card.title}`}
                onClick={() => {
                  setActiveId(card.id);
                  setModalOpen(false);
                }}
              >
                <span className="fsvc-thumb-media" style={{ backgroundImage: `url(${card.foldImageUrl})` }} />
                <span className="fsvc-thumb-label">{card.videoLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {modalOpen ? <StudioPreviewModal card={active} onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}

function livePrimaryLabel(card: StudioStackCardData): string {
  if (card.id === "gap-u") return "Enter Gap U";
  return "Visit live Space";
}

function renderActions(card: StudioStackCardData, onPreview: () => void) {
  const href = card.exploreHref;

  if (card.preferLiveHeroCta && href) {
    return (
      <>
        <Link href={href} className="fsvc-btn fsvc-btn-live" scroll>
          {livePrimaryLabel(card)} <ArrowUpRight style={{ width: 15, height: 15 }} aria-hidden />
        </Link>
        <button type="button" className="fsvc-btn fsvc-btn-ghost" onClick={onPreview}>
          Studio preview …
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="fsvc-btn fsvc-btn-primary-solid" onClick={onPreview}>
        Studio preview <ArrowRight style={{ width: 14, height: 14 }} aria-hidden />
      </button>
      {href ? (
        href.startsWith("#") ? (
          <Link href={href} className="fsvc-btn fsvc-btn-ghost">
            Browse demos <ArrowRight style={{ width: 13, height: 13 }} aria-hidden />
          </Link>
        ) : (
          <Link href={href} className="fsvc-btn fsvc-btn-ghost" scroll>
            Visit live Space <ArrowRight style={{ width: 13, height: 13 }} aria-hidden />
          </Link>
        )
      ) : null}
    </>
  );
}

function posterOnlyStyle(card: StudioStackCardData): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${card.foldImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
