"use client";

import { useState } from "react";
import { STUDIO_STACK_CARDS, type StudioStackCardData, type StudioStackCardId } from "@/lib/studios/landing/studioStackData";
import { StudioPreviewModal } from "@/components/studios/landing/StudioPreviewModal";

const LAYER_OFFSET: Record<StudioStackCardData["layer"], { x: number; y: number; rotate: number; z: number }> = {
  back: { x: -18, y: 14, rotate: -5, z: 1 },
  middle: { x: 8, y: 6, rotate: 2.5, z: 2 },
  front: { x: 0, y: 0, rotate: -1.25, z: 3 },
};

export function StudioStackCards() {
  const [activeId, setActiveId] = useState<StudioStackCardId | null>(null);
  const activeCard = activeId ? STUDIO_STACK_CARDS.find((c) => c.id === activeId) : null;

  return (
    <>
      <style>{`
        .studio-stack-root {
          position: relative;
          width: 100%;
          max-width: 380px;
          min-height: clamp(280px, 42vw, 340px);
          margin: 0 auto;
        }
        .studio-stack-card {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(100%, 320px);
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 18px 40px rgba(38, 38, 38, 0.12), 0 4px 12px rgba(38, 38, 38, 0.06);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
          will-change: transform;
        }
        .studio-stack-card:focus-visible {
          outline: 2px solid #b8956c;
          outline-offset: 3px;
        }
        .studio-stack-card:hover,
        .studio-stack-card:focus-visible {
          box-shadow: 0 26px 52px rgba(38, 38, 38, 0.16), 0 0 0 1px rgba(184, 149, 108, 0.35),
            0 0 28px rgba(212, 165, 116, 0.22);
        }
        @media (prefers-reduced-motion: reduce) {
          .studio-stack-card {
            transition: none;
          }
        }
        .studio-stack-card-thumb {
          width: 100%;
          aspect-ratio: 16 / 10;
          background-size: cover;
          background-position: center;
        }
        .studio-stack-card-body {
          padding: 14px 16px 16px;
        }
        .studio-stack-card-title {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 800;
          color: #1c1917;
          letter-spacing: -0.02em;
        }
        .studio-stack-card-sub {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
          color: #78716c;
        }
        .studio-stack-card-pill {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        @media (max-width: 879px) {
          .studio-stack-root {
            min-height: 300px;
            max-width: 100%;
          }
          .studio-stack-card {
            width: min(92%, 300px);
          }
        }
      `}</style>

      <div className="studio-stack-root" aria-label="Preview living Studios">
        {STUDIO_STACK_CARDS.map((card) => {
          const off = LAYER_OFFSET[card.layer];
          const isFront = card.layer === "front";
          return (
            <button
              key={card.id}
              type="button"
              className="studio-stack-card"
              aria-haspopup="dialog"
              aria-expanded={activeId === card.id}
              aria-label={`Open preview: ${card.title}`}
              style={{
                zIndex: off.z,
                transform: `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px)) rotate(${off.rotate}deg)`,
              }}
              onMouseEnter={(e) => {
                if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                const lift = isFront ? -10 : -6;
                e.currentTarget.style.transform = `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y - lift}px)) rotate(${off.rotate}deg) scale(1.02)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px)) rotate(${off.rotate}deg)`;
              }}
              onFocus={(e) => {
                const lift = isFront ? -8 : -5;
                e.currentTarget.style.transform = `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y - lift}px)) rotate(${off.rotate}deg) scale(1.01)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px)) rotate(${off.rotate}deg)`;
              }}
              onClick={() => setActiveId(card.id)}
            >
              <div
                className="studio-stack-card-thumb"
                style={{ backgroundImage: `url(${card.foldImageUrl})` }}
                aria-hidden
              />
              <div className="studio-stack-card-body">
                <p className="studio-stack-card-title">{card.title}</p>
                <p className="studio-stack-card-sub">{card.subcopy}</p>
                {card.announcementPreview ? (
                  <span
                    className="studio-stack-card-pill"
                    style={{ background: card.accentSoft, color: card.accent }}
                  >
                    {card.announcementPreview}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {activeCard ? <StudioPreviewModal card={activeCard} onClose={() => setActiveId(null)} /> : null}
    </>
  );
}
