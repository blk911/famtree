"use client";
// app/(app)/discovery/page.tsx
// AIH Discovery Channel — subject navigation home.
// This page is NAVIGATION, not a content dump.
// Subject pages are the exploration hubs.

import { ShieldCheck, Tv2, BookOpen, Users } from "lucide-react";
import { SUBJECTS, FEATURED_HOME_TRAILS } from "@/lib/discovery/catalog";
import { DiscoverySubjectCard } from "@/components/discovery/DiscoverySubjectCard";
import { DiscoveryTrailCard } from "@/components/discovery/DiscoveryTrailCard";

export default function DiscoveryHomePage() {
  return (
    <>
      <style>{`
        .disc-subject-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 480px) {
          .disc-subject-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 860px) {
          .disc-subject-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .disc-trails-row {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        @media (min-width: 700px) {
          .disc-trails-row {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 8px;
            scrollbar-width: none;
          }
          .disc-trails-row::-webkit-scrollbar { display: none; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "#0d0d0f",
          color: "#fff",
          paddingBottom: 80,
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div
          style={{
            width: "100%",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.14) 0%, transparent 100%)",
            padding: "clamp(32px,5vw,60px) clamp(16px,4vw,40px) clamp(28px,4vw,48px)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(168,85,247,0.85)",
            }}
          >
            AIH Discovery Channel
          </p>

          <h1
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(26px, 4.5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.06,
              color: "#fff",
              maxWidth: 600,
            }}
          >
            Where do you want{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              to explore?
            </span>
          </h1>

          <p
            style={{
              margin: "0 0 26px",
              fontSize: "clamp(13px, 1.6vw, 16px)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.46)",
              maxWidth: 500,
            }}
          >
            Nine curated subjects. Hundreds of investigations, projects, and trails.
            Everything plays inside Safe View — no ads, no comments, no rabbit holes.
          </p>

          {/* Stat pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: <Tv2 style={{ width: 12, height: 12 }} />, label: "9 Subjects" },
              { icon: <BookOpen style={{ width: 12, height: 12 }} />, label: "90+ Items" },
              { icon: <Users style={{ width: 12, height: 12 }} />, label: "All Ages" },
              { icon: <ShieldCheck style={{ width: 12, height: 12 }} />, label: "Safe View" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.56)",
                  letterSpacing: "0.02em",
                }}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Subject grid ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(32px,4vw,52px) clamp(16px,4vw,40px) 0",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(15px, 2vw, 18px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Choose a subject
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
              Each subject is its own exploration hub with investigations, projects, and trails.
            </p>
          </div>

          <div className="disc-subject-grid">
            {SUBJECTS.map((subject) => (
              <DiscoverySubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </div>

        {/* ── Featured Trails ──────────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(44px,5vw,64px) clamp(16px,4vw,40px) 0",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(15px, 2vw, 18px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Guided learning paths
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
              Curated sequences that take you from first concepts to deep understanding.
            </p>
          </div>

          <div className="disc-trails-row">
            {FEATURED_HOME_TRAILS.map((trail) => (
              <DiscoveryTrailCard key={trail.id} trail={trail} />
            ))}
          </div>
        </div>

        {/* ── Safe View section ────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(44px,5vw,64px) clamp(16px,4vw,40px) 0",
            padding: "clamp(24px,3.5vw,40px) clamp(20px,4vw,44px)",
            borderRadius: 20,
            background: "rgba(20,83,45,0.16)",
            border: "1px solid rgba(74,222,128,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.24)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ShieldCheck style={{ width: 24, height: 24, color: "#4ade80" }} />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(16px, 2vw, 20px)",
                  fontWeight: 900, letterSpacing: "-0.03em", color: "#fff",
                }}
              >
                How Safe View Works
              </h2>
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: 13, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.48)", maxWidth: 560,
                }}
              >
                Every item on the Discovery Channel opens inside AIH Safe View — a fully
                contained player built for family learning. There is no autoplay queue, no
                comment section, no external links, and no recommendation engine pointing
                you away from what you chose to explore.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  "Approved content only",
                  "No ads or sponsorships",
                  "No comment sections",
                  "No autoplay rabbit holes",
                  "No external links",
                  "Watch · Replay · Close",
                ].map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, color: "rgba(255,255,255,0.58)", fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: "#4ade80", flexShrink: 0,
                      }}
                    />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(40px,5vw,56px) clamp(16px,4vw,40px) 0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 6px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
            }}
          >
            AIH Discovery Channel — MVP
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.16)" }}>
            Full video library, parental controls, and saved trails coming soon.
          </p>
        </div>
      </div>
    </>
  );
}
