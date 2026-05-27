"use client";
// app/(app)/discovery/[subject]/page.tsx
// Subject exploration hub — the rich content layer beneath the home nav.
// Hero → Subtopics → Investigations → Projects → Trails → Safe View info

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getSubjectBySlug } from "@/lib/discovery/catalog";
import type { DiscoveryItem } from "@/lib/discovery/types";
import { DiscoverySubjectHero } from "@/components/discovery/DiscoverySubjectHero";
import { DiscoverySubtopicGrid } from "@/components/discovery/DiscoverySubtopicGrid";
import { DiscoveryInvestigationCard } from "@/components/discovery/DiscoveryInvestigationCard";
import { DiscoveryTrailCard } from "@/components/discovery/DiscoveryTrailCard";
import { DiscoverySafeViewModal } from "@/components/discovery/DiscoverySafeViewModal";

export default function SubjectPage({ params }: { params: { subject: string } }) {
  const [activeItem, setActiveItem] = useState<DiscoveryItem | null>(null);

  const subject = getSubjectBySlug(params.subject);

  // ── Not found ────────────────────────────────────────────────────────────
  if (!subject) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "#0d0d0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 48 }}>🔭</span>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
          Subject not found
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.46)", maxWidth: 340, lineHeight: 1.55 }}>
          That subject does not exist yet. Head back to the Discovery home to explore what is available.
        </p>
        <a
          href="/discovery"
          style={{
            marginTop: 8,
            display: "inline-block",
            padding: "9px 20px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.82)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Back to Discovery
        </a>
      </div>
    );
  }

  const SECTION_PAD = "clamp(16px,4vw,40px)";

  return (
    <>
      <style>{`
        .dsp-inv-row {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
        }
        .dsp-inv-row::-webkit-scrollbar { display: none; }
        .dsp-proj-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 600px) {
          .dsp-proj-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 880px) {
          .dsp-proj-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .dsp-trail-row {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        @media (min-width: 700px) {
          .dsp-trail-row { flex-direction: row; }
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
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <DiscoverySubjectHero subject={subject} />

        {/* ── Subtopics ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: `clamp(28px,4vw,44px) ${SECTION_PAD} 0`,
          }}
        >
          <SectionLabel>Explore by subtopic</SectionLabel>
          <DiscoverySubtopicGrid subtopics={subject.subtopics} accentColor={subject.accentColor} />
        </div>

        {/* ── Featured Investigations ─────────────────────────────────── */}
        <div style={{ paddingTop: "clamp(36px,4.5vw,52px)" }}>
          <div style={{ paddingLeft: SECTION_PAD, paddingRight: SECTION_PAD, marginBottom: 16 }}>
            <SectionLabel>Featured Investigations</SectionLabel>
            <SectionSub>
              Curated explorations — click any card to open Safe View.
            </SectionSub>
          </div>
          <div className="dsp-inv-row" style={{ paddingLeft: SECTION_PAD, paddingRight: SECTION_PAD }}>
            {subject.featuredItems.map((item) => (
              <DiscoveryInvestigationCard key={item.id} item={item} onPlay={setActiveItem} />
            ))}
          </div>
        </div>

        {/* ── Hands-On Projects ──────────────────────────────────────── */}
        <div
          style={{ padding: `clamp(36px,4.5vw,52px) ${SECTION_PAD} 0` }}
        >
          <SectionLabel>Hands-On Projects</SectionLabel>
          <SectionSub>Build something real. Difficulty and build time shown on each card.</SectionSub>
          <div className="dsp-proj-grid" style={{ marginTop: 16 }}>
            {subject.projects.map((item) => (
              <DiscoveryInvestigationCard key={item.id} item={item} onPlay={setActiveItem} wide />
            ))}
          </div>
        </div>

        {/* ── Learning Trails ────────────────────────────────────────── */}
        <div
          style={{ padding: `clamp(36px,4.5vw,52px) ${SECTION_PAD} 0` }}
        >
          <SectionLabel>Learning Trails</SectionLabel>
          <SectionSub>Follow a curated path from first concepts to deep mastery.</SectionSub>
          <div className="dsp-trail-row" style={{ marginTop: 16 }}>
            {subject.trails.map((trail) => (
              <DiscoveryTrailCard key={trail.id} trail={trail} />
            ))}
          </div>
        </div>

        {/* ── Safe View panel ────────────────────────────────────────── */}
        <div
          style={{
            margin: `clamp(40px,5vw,60px) ${SECTION_PAD} 0`,
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(20,83,45,0.16)",
            border: "1px solid rgba(74,222,128,0.12)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <ShieldCheck style={{ width: 16, height: 16, color: "#4ade80", flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.50)" }}>
            <strong style={{ color: "#4ade80" }}>Everything in this channel is reviewed</strong>{" "}
            for safe viewing inside AIH Discovery. Content opens in Safe View — no external
            navigation, no comment sections, no autoplay queues.
          </p>
        </div>
      </div>

      {/* Safe View modal */}
      <DiscoverySafeViewModal item={activeItem} onClose={() => setActiveItem(null)} />
    </>
  );
}

// ─── Section label helpers ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 5px",
        fontSize: "clamp(15px, 2vw, 18px)",
        fontWeight: 900,
        letterSpacing: "-0.025em",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: 500, lineHeight: 1.5 }}>
      {children}
    </p>
  );
}
