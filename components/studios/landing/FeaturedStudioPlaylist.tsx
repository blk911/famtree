"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import {
  FEATURED_STUDIO_VIDEO_CARDS,
  type StudioStackCardData,
  type StudioStackCardId,
} from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";

const DEFAULT_ACTIVE_ID: StudioStackCardId = "private-client-network";

export function FeaturedStudioPlaylist() {
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
        .fsp {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fsp-shell {
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(28, 25, 23, 0.085);
          box-shadow:
            0 10px 28px rgba(38, 38, 38, 0.08),
            0 1px 4px rgba(38, 38, 38, 0.04);
        }
        .fsp-video-slot {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          max-height: 198px;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 52%), #171412;
          overflow: hidden;
        }
        .fsp-video-slot video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #1c1917;
        }
        .fsp-poster-tint {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.08;
          pointer-events: none;
        }
        .fsp-play-ornament {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: opacity 0.22s ease;
          opacity: 0.74;
        }
        .fsp-video-slot:hover .fsp-play-ornament {
          opacity: 1;
        }
        .fsp-play-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(253, 252, 251, 0.95);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.28);
        }
        .fsp-feature-meta {
          padding: 10px 13px 12px;
          border-top: 1px solid rgba(28, 25, 23, 0.06);
        }
        .fsp-feature-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.024em;
          color: #1c1917;
        }
        .fsp-feature-sub {
          margin: 0 0 10px;
          font-size: 12px;
          line-height: 1.45;
          color: #78716c;
        }
        .fsp-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .fsp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }
        .fsp-btn:hover {
          transform: translateY(-1px);
        }
        .fsp-btn-primary-solid {
          background: #292524;
          color: #fafaf9;
        }
        .fsp-btn-live {
          background: #9d174d;
          border-color: rgba(157, 23, 77, 0.3);
          color: #fff;
        }
        .fsp-btn-ghost {
          background: rgba(255, 255, 255, 0.92);
          color: #44403c;
          border-color: rgba(28, 25, 23, 0.12);
        }
        .fsp-divider-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a8a29e;
          margin: 0 0 2px;
        }
        .fsp-playlist {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fsp-pl-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 6px 8px;
          border-radius: 12px;
          border: 1px solid rgba(28, 25, 23, 0.08);
          border-left-width: 3px;
          border-left-color: transparent;
          background: rgba(250, 250, 249, 0.65);
          text-align: left;
          cursor: pointer;
          min-height: 64px;
          max-height: 78px;
          transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease, background 0.14s ease;
        }
        .fsp-pl-row:hover:not(.fsp-pl-row--active) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(38, 38, 38, 0.08);
        }
        .fsp-pl-row--active {
          background: rgba(255, 255, 255, 0.95);
          border-color: transparent;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        .fsp-pl-thumb {
          flex: 0 0 auto;
          width: 96px;
          height: 54px;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(28,25,23,0.06);
        }
        .fsp-pl-copy {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fsp-pl-title {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.015em;
          color: #1c1917;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fsp-pl-desc {
          margin: 0;
          font-size: 11px;
          line-height: 1.3;
          color: #78716c;
          display: -webkit-box;
          line-clamp: 2;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .fsp-btn:hover,
          .fsp-pl-row:hover {
            transform: none !important;
          }
          .fsp-play-ornament {
            opacity: 0.92 !important;
          }
        }

        @media (max-width: 879px) {
          .fsp-video-slot {
            max-height: 186px;
          }
          .fsp-feature-meta {
            padding: 9px 12px 11px;
          }
          .fsp-playlist {
            flex-direction: row;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 8px;
            padding: 6px 0 8px;
            margin: 0 -4px;
            scroll-snap-type: x proximity;
            scrollbar-width: thin;
          }
          .fsp-pl-row {
            flex: 0 0 auto;
            width: min(82vw, 260px);
            scroll-snap-align: start;
            min-height: 68px;
          }
          .fsp-pl-thumb {
            width: 88px;
            height: 50px;
          }
        }
      `}</style>

      <section className="fsp" aria-label="Featured Studio previews — playlist">
        <div className="fsp-shell">
          <div className="fsp-video-slot">
            <span className="fsp-poster-tint" style={{ backgroundImage: `url(${active.foldImageUrl})` }} />
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
                aria-label={`Featured clip — ${active.videoLabel}`}
              />
            ) : (
              <div role="img" aria-label={active.title} style={posterOnlyStyle(active)} />
            )}
            <span className="fsp-play-ornament">
              <span className="fsp-play-badge" aria-hidden>
                <Play style={{ width: 22, height: 22 }} fill="currentColor" />
              </span>
            </span>
          </div>
          <div className="fsp-feature-meta">
            <p className="fsp-feature-title">{active.title}</p>
            <p className="fsp-feature-sub">{active.subcopy}</p>
            <div className="fsp-actions">{renderActions(active, openPreview)}</div>
          </div>
        </div>

        <div>
          <p className="fsp-divider-label">Watch next</p>
          <div className="fsp-playlist" role="tablist" aria-label="Browse Studio previews">
            {FEATURED_STUDIO_VIDEO_CARDS.map((card) => {
              const selected = card.id === activeId;
              return (
                <button
                  key={card.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  className={`fsp-pl-row ${selected ? "fsp-pl-row--active" : ""}`}
                  style={
                    selected
                      ? ({
                          borderLeftColor: card.accent,
                          backgroundColor: card.accentSoft,
                        } as CSSProperties)
                      : undefined
                  }
                  onClick={() => {
                    setActiveId(card.id);
                    setModalOpen(false);
                  }}
                >
                  <span className="fsp-pl-thumb" style={{ backgroundImage: `url(${card.foldImageUrl})` }} />
                  <span className="fsp-pl-copy">
                    <span className="fsp-pl-title">{card.title}</span>
                    <span className="fsp-pl-desc">{card.playlistDescriptor}</span>
                  </span>
                </button>
              );
            })}
          </div>
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
        <Link href={href} className="fsp-btn fsp-btn-live" scroll>
          {livePrimaryLabel(card)} <ArrowUpRight style={{ width: 14, height: 14 }} aria-hidden />
        </Link>
        <button type="button" className="fsp-btn fsp-btn-ghost" onClick={onPreview}>
          Studio preview …
        </button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="fsp-btn fsp-btn-primary-solid" onClick={onPreview}>
        Studio preview <ArrowRight style={{ width: 13, height: 13 }} aria-hidden />
      </button>
      {href ? (
        href.startsWith("#") ? (
          <Link href={href} className="fsp-btn fsp-btn-ghost">
            Browse demos <ArrowRight style={{ width: 12, height: 12 }} aria-hidden />
          </Link>
        ) : (
          <Link href={href} className="fsp-btn fsp-btn-ghost" scroll>
            Visit live Space <ArrowRight style={{ width: 12, height: 12 }} aria-hidden />
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
