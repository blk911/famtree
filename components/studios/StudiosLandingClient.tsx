"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronRight,
  Cpu,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { FeaturedStudioPlaylist } from "@/components/studios/landing/FeaturedStudioPlaylist";
import { MOCK_TESTIMONIALS, MOCK_PROVIDERS } from "@/lib/studios/mockStudios";
import { StudiosFooter } from "@/components/studios/StudiosFooter";


import { PROVIDER_CATEGORY_LABELS } from "@/types/studios";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import type { LucideIcon } from "lucide-react";

const ink = STUDIOS_INK;
const muted = STUDIOS_MUTED;
const line = STUDIOS_LINE;
const cardShadow = STUDIOS_CARD_SHADOW;

type BenefitDef = {
  id: string;
  title: string;
  punch: string;
  accent: string;
  accentSoft: string;
  Icon: LucideIcon;
  modalHeadline: string;
  body: string[];
};

const BENEFITS: BenefitDef[] = [
  {
    id: "human",
    title: "Human contact, on purpose",
    punch: "While feed algorithms decide who sees whom, here nothing opens until a real person says yes.",
    accent: "#b45309",
    accentSoft: "#fffbeb",
    Icon: Heart,
    modalHeadline: "Technology is everywhere — trust shouldn’t be outsourced to it.",
    body: [
      "Studios exists because coaching, recovery, and wellness still run on chemistry, judgment, and continuity. We lean into that instead of hiding it behind anonymous intake forms.",
      "Prospects earn access through identity-aware flows — not because we love friction for its own sake, but because relationships built on recognition actually stick.",
    ],
  },
  {
    id: "connections",
    title: "Relationships that empower",
    punch: "Introductions carry context — not scraped lists or cold leads pretending to be warm.",
    accent: "#9d174d",
    accentSoft: "#fdf2f8",
    Icon: Users,
    modalHeadline: "Your reputation travels with every referral.",
    body: [
      "Word-of-mouth already drives the best businesses. Studios gives it rails: explicit invitations, visible lineage between members and providers, and fewer strangers pretending they were “recommended.”",
      "That helps everyone in the room — trainers, clients, and allied providers — invest in quality intros instead of volume hacks.",
    ],
  },
  {
    id: "trust",
    title: "You approve every door",
    punch: "No mystery bookings from bots — you decide who gets trial access and who doesn’t.",
    accent: "#1d4ed8",
    accentSoft: "#eff6ff",
    Icon: ShieldCheck,
    modalHeadline: "Inbound without chaos.",
    body: [
      "Marketplaces optimize for transactions; Studios optimizes for fit. That means voice or video intros, deliberate approvals, and fewer mismatched appointments cluttering your calendar.",
      "You stay sovereign over your roster — the platform helps communicate boundaries, not erase them.",
    ],
  },
  {
    id: "counterweight",
    title: "A counterweight to automation",
    punch: "Computers scale endlessly; your craft deserves space where contact still matters.",
    accent: "#047857",
    accentSoft: "#ecfdf5",
    Icon: Cpu,
    modalHeadline: "We’re not anti-tech — we’re pro-human judgment.",
    body: [
      "Automation isn’t going away, and it shouldn’t. But the parts of your practice that depend on empathy and accountability deserve tooling that reflects those values.",
      "Studios is that lane — tightly scoped so humans remain accountable for who enters their professional orbit.",
    ],
  },
];

export function StudiosLanding() {
  const [openBenefitId, setOpenBenefitId] = useState<string | null>(null);

  useEffect(() => {
    if (!openBenefitId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenBenefitId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openBenefitId]);

  const openBenefit = openBenefitId ? BENEFITS.find((b) => b.id === openBenefitId) : null;

  return (
    <>
      <style>{`
        .studios-lp-benefit:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .studios-lp-studio-card:hover { transform: translateY(-1px); }
        .studios-hero-shell {
          max-width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          gap: clamp(11px, 1.85vw, 18px);
          align-items: start;
          grid-template-columns: 1fr;
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .studios-hero-copy-inner {
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
        }
        .studios-hero-pitch-copy {
          max-width: none;
          margin-right: auto;
        }
        @media (min-width: 880px) {
          .studios-hero-shell {
            grid-template-columns: minmax(0, 36%) minmax(0, 42%) minmax(0, 22%);
            text-align: left;
          }
          .studios-hero-copy-inner {
            margin-left: 0;
            margin-right: 0;
            width: 100%;
            max-width: min(396px, 100%);
          }
          .studios-hero-pitch-copy p {
            max-width: 40ch;
            line-height: 1.43;
          }
          .studios-hero-badge-row { justify-content: flex-start !important; }
        }
        .studios-hero-explore {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 10px;
          margin-top: 4px;
          justify-content: center;
        }
        .studios-hero-explore-link {
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          padding-bottom: 1px;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .studios-hero-explore-link:hover {
          border-bottom-color: currentColor;
        }
        .studios-hero-explore-sep {
          color: rgba(168, 162, 158, 0.95);
          font-size: 12px;
          user-select: none;
        }
        @media (min-width: 880px) {
          .studios-hero-explore {
            justify-content: flex-start;
          }
        }
      `}</style>

      {/* ── Fold 1 — storytelling hero ─────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "clamp(18px, 3vw, 28px) 18px 24px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-40px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(520px, 92vw)",
            height: "160px",
            background: "radial-gradient(circle, rgba(255, 218, 230, 0.42) 0%, transparent 72%)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }}
        />

        <div className="studios-hero-shell">
          <div className="studios-hero-copy-inner">
            <div
              className="studios-hero-badge-row"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: muted,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                }}
              >
                <Sparkles style={{ width: "12px", height: "12px", color: "#d4a574" }} />
                AIH Studios · Beta
              </div>
            </div>

            <div className="studios-hero-pitch-copy">
            <h1
              style={{
                fontSize: "clamp(24px, 3.85vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-1.2px",
                lineHeight: 1.05,
                marginBottom: "10px",
                color: ink,
              }}
            >
              Where humans
              <span style={{ color: "#b8956c" }}> still connect</span>
            </h1>

            <p
              style={{
                fontSize: "clamp(14px, 1.85vw, 16px)",
                lineHeight: 1.5,
                color: muted,
                margin: "0 0 10px",
                fontWeight: 500,
              }}
            >
              The world is filling up with automated replies and optimized feeds. Studios is the opposite — a private place for trainers and wellness pros to build{" "}
              <strong style={{ color: ink, fontWeight: 700 }}>relationships that matter</strong>, with clients who earn access instead of arriving anonymously at scale.
            </p>

            <div className="studios-hero-explore" aria-label="Secondary navigation">
              <Link href="/studios/gap-u" className="studios-hero-explore-link" style={{ color: "#9d174d" }}>
                Explore Gap U
              </Link>
              <span className="studios-hero-explore-sep" aria-hidden>
                ·
              </span>
              <Link href="#studios-live" className="studios-hero-explore-link" style={{ color: ink }}>
                See live pages
              </Link>
            </div>
            </div>
          </div>

          <FeaturedStudioPlaylist />
        </div>
      </section>

      {/* ── Fold 2 — benefits + studios + proof ───────────────────────────── */}
      <section style={{ padding: "28px 20px 40px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#b8956c",
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            Why studios
          </p>
          <h2
            style={{
              fontSize: "clamp(20px, 3vw, 26px)",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: "8px",
              letterSpacing: "-0.4px",
              color: ink,
              lineHeight: 1.2,
            }}
          >
            Empowering personal connections — not another automation layer
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: muted,
              textAlign: "center",
              marginBottom: "22px",
              maxWidth: "560px",
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            Tap a card for the full story. Same marketing surface every time — nothing fetched at random.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "12px",
              marginBottom: "36px",
            }}
          >
            {BENEFITS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="studios-lp-benefit"
                onClick={() => setOpenBenefitId(b.id)}
                style={{
                  textAlign: "left",
                  padding: "18px 16px",
                  borderRadius: "16px",
                  background: "#fff",
                  border: `1px solid ${line}`,
                  boxShadow: cardShadow,
                  cursor: "pointer",
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  borderTop: `3px solid ${b.accent}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    background: b.accentSoft,
                    color: b.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <b.Icon style={{ width: "18px", height: "18px" }} strokeWidth={2.25} />
                </div>
                <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.02em", color: ink, lineHeight: 1.25 }}>
                  {b.title}
                </span>
                <span style={{ fontSize: "13px", color: "#525252", lineHeight: 1.45 }}>{b.punch}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: b.accent, marginTop: "auto" }}>
                  Learn more →
                </span>
              </button>
            ))}
          </div>

          <div id="studios-live" style={{ scrollMarginTop: "72px" }}>
            <h3
              style={{
                fontSize: "clamp(17px, 2.4vw, 21px)",
                fontWeight: 800,
                textAlign: "center",
                marginBottom: "6px",
                letterSpacing: "-0.3px",
                color: ink,
              }}
            >
              Live studio pages
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: muted,
                textAlign: "center",
                marginBottom: "18px",
              }}
            >
              Same layout you launch — explore examples below.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
              <Link
                className="studios-lp-studio-card"
                href="/studios/gap-u"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "linear-gradient(165deg, #fdf2f8 0%, #fff 60%)",
                  border: "1px solid rgba(157, 23, 77, 0.18)",
                  boxShadow: cardShadow,
                  textDecoration: "none",
                  color: ink,
                  transition: "transform 0.12s ease",
                  gridColumn: "1 / -1",
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#9d174d",
                  }}
                >
                  Flagship live Studio
                </span>
                <span style={{ fontSize: "16px", fontWeight: 800 }}>Gap U Learning Lab</span>
                <span style={{ fontSize: "12px", color: muted, lineHeight: 1.45 }}>
                  Future learning · homeschool pods · invention labs — invite-only, not a public feed.
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, marginTop: "4px", color: "#9d174d" }}>
                  Explore Gap U <ChevronRight style={{ width: "14px", height: "14px" }} />
                </span>
              </Link>
              {MOCK_PROVIDERS.filter((p) => p.active).map((p) => (
                <Link
                  key={p.id}
                  className="studios-lp-studio-card"
                  href={`/studios/${p.slug}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "#fff",
                    border: `1px solid ${line}`,
                    boxShadow: cardShadow,
                    textDecoration: "none",
                    color: ink,
                    transition: "transform 0.12s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: muted,
                    }}
                  >
                    {PROVIDER_CATEGORY_LABELS[p.category] ?? p.category}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 800 }}>{p.displayName}</span>
                  {p.locationLabel && <span style={{ fontSize: "12px", color: muted }}>{p.locationLabel}</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
                    View <ChevronRight style={{ width: "14px", height: "14px" }} />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "22px 18px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.65)",
              border: `1px solid ${line}`,
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: muted,
                textAlign: "center",
                marginBottom: "14px",
              }}
            >
              Operators on Studios
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              {MOCK_TESTIMONIALS.map((t) => (
                <blockquote
                  key={t.id}
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "#fff",
                    border: `1px solid ${line}`,
                  }}
                >
                  <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#404040", marginBottom: "10px", fontStyle: "italic" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer style={{ fontSize: "12px", fontWeight: 700, color: ink }}>{t.attribution}</footer>
                  {t.role && <div style={{ fontSize: "11px", color: muted, marginTop: "3px" }}>{t.role}</div>}
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <StudiosFooter />

      {openBenefit && typeof document !== "undefined" &&
        createPortal(
          <BenefitModal benefit={openBenefit} onClose={() => setOpenBenefitId(null)} />,
          document.body,
        )}
    </>
  );
}

function BenefitModal({ benefit, onClose }: { benefit: BenefitDef; onClose: () => void }) {
  const Icon = benefit.Icon;
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`benefit-modal-${benefit.id}`}
        style={{
          background: "#fff",
          borderRadius: "18px",
          maxWidth: "440px",
          width: "100%",
          maxHeight: "min(85vh, 520px)",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          border: `1px solid ${line}`,
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${line}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: benefit.accentSoft,
              color: benefit.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: "20px", height: "20px" }} strokeWidth={2.25} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={`benefit-modal-${benefit.id}`} style={{ fontSize: "18px", fontWeight: 800, color: ink, margin: "0 0 6px", lineHeight: 1.25 }}>
              {benefit.modalHeadline}
            </h2>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: benefit.accent }}>{benefit.title}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(0,0,0,0.05)",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X style={{ width: "18px", height: "18px", color: ink }} />
          </button>
        </div>
        <div style={{ padding: "18px 20px 22px" }}>
          {benefit.body.map((para, i) => (
            <p key={i} style={{ fontSize: "14px", lineHeight: 1.62, color: "#404040", margin: "0 0 14px" }}>
              {para}
            </p>
          ))}
          <Link
            href="/studios/start"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "6px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#b8956c",
              textDecoration: "none",
            }}
          >
            Start your studio <ArrowRight style={{ width: "14px", height: "14px" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
