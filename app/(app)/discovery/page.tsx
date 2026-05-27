"use client";
// app/(app)/discovery/page.tsx
// AIH Discovery Channel — Netflix-style family-safe learning hub.
// Full-bleed dark layout (AppShell skips AppContentWrap for /discovery).

import { useState } from "react";
import { ShieldCheck, Tv2, BookOpen, Users } from "lucide-react";
import { DISCOVERY_CATALOG } from "@/lib/discovery/catalog";
import type { DiscoveryItem } from "@/lib/discovery/catalog";
import { DiscoveryChannelRow } from "@/components/discovery/DiscoveryChannelRow";
import { DiscoverySafeVideoModal } from "@/components/discovery/DiscoverySafeVideoModal";

export default function DiscoveryPage() {
  const [activeItem, setActiveItem] = useState<DiscoveryItem | null>(null);

  return (
    <>
      <style>{`
        /* Hide scrollbars on channel rows */
        .dcr-scroll::-webkit-scrollbar { display: none; }
        /* Hide arrow buttons on mobile */
        @media (max-width: 600px) { .dcr-arrows { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; }
        }
      `}</style>

      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "#0d0d0f",
          color: "#fff",
          fontFamily: "inherit",
          paddingBottom: 80,
        }}
      >
        {/* ── Hero banner ──────────────────────────────────────────────────── */}
        <div
          style={{
            width: "100%",
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.18) 0%, rgba(13,13,15,0) 100%), " +
              "linear-gradient(135deg, #0d0d0f 0%, #141420 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "clamp(28px, 5vw, 56px) clamp(16px, 4vw, 40px) clamp(24px, 4vw, 44px)",
          }}
        >
          {/* Label */}
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(168,85,247,0.9)",
            }}
          >
            AIH Discovery Channel
          </p>

          <h1
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#fff",
              maxWidth: 680,
            }}
          >
            Learn Anything.{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Safely.
            </span>
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              fontSize: "clamp(14px, 1.8vw, 17px)",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.52)",
              maxWidth: 560,
            }}
          >
            Curated educational content across 9 channels — science, math, code, history,
            and more. Every video plays in Safe View: no ads, no comments, no rabbit holes.
          </p>

          {/* Stat pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { icon: <Tv2 style={{ width: 13, height: 13 }} />, label: "9 Channels" },
              { icon: <BookOpen style={{ width: 13, height: 13 }} />, label: "45 Items" },
              { icon: <Users style={{ width: 13, height: 13 }} />, label: "All Ages" },
              { icon: <ShieldCheck style={{ width: 13, height: 13 }} />, label: "Safe View" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.65)",
                  letterSpacing: "0.02em",
                }}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Channel rows ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(36px, 5vw, 56px)",
            paddingTop: "clamp(32px, 4vw, 48px)",
          }}
        >
          {DISCOVERY_CATALOG.map((channel) => (
            <DiscoveryChannelRow
              key={channel.id}
              channel={channel}
              onPlay={setActiveItem}
            />
          ))}
        </div>

        {/* ── Safe View section ────────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(48px, 6vw, 72px) clamp(16px, 4vw, 40px) 0",
            padding: "clamp(28px, 4vw, 44px) clamp(20px, 4vw, 48px)",
            borderRadius: 20,
            background: "rgba(20,83,45,0.18)",
            border: "1px solid rgba(74,222,128,0.16)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            {/* Icon column */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(74,222,128,0.14)",
                border: "1px solid rgba(74,222,128,0.26)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck style={{ width: 26, height: 26, color: "#4ade80" }} />
            </div>

            {/* Copy */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(18px, 2.2vw, 22px)",
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.03em",
                }}
              >
                How Safe View Works
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.55)",
                  maxWidth: 580,
                }}
              >
                Every item on the Discovery Channel plays in our Safe View player — a fully
                contained experience built specifically for family learning. There are no
                autoplay queues, no comment sections, no external links, and no
                recommendation engines pointing away from the content you chose.
              </p>

              {/* Feature list */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  "No ads or sponsorships",
                  "No comment sections",
                  "No autoplay rabbit holes",
                  "No external links",
                  "Watch · Replay · Close",
                  "Age-tier labels on every item",
                ].map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.65)",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#4ade80",
                        flexShrink: 0,
                      }}
                    />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer CTA ───────────────────────────────────────────────────── */}
        <div
          style={{
            margin: "clamp(40px, 5vw, 60px) clamp(16px, 4vw, 40px) 0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              color: "rgba(255,255,255,0.28)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            AIH Discovery Channel — MVP
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
            Full video library and parental controls coming soon.
          </p>
        </div>
      </div>

      {/* Safe Video Modal */}
      <DiscoverySafeVideoModal item={activeItem} onClose={() => setActiveItem(null)} />
    </>
  );
}
