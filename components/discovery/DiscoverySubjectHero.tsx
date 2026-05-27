"use client";
// components/discovery/DiscoverySubjectHero.tsx
// Large hero section for individual subject pages.

import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import type { Subject } from "@/lib/discovery/types";

interface Props {
  subject: Subject;
}

export function DiscoverySubjectHero({ subject }: Props) {
  const totalItems = subject.featuredItems.length + subject.projects.length + subject.trails.length;

  return (
    <div
      style={{
        width: "100%",
        background: subject.thumbGradient,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dark overlay for legibility */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "clamp(22px,4vw,44px) clamp(16px,4vw,40px) clamp(28px,5vw,56px)",
          maxWidth: 900,
        }}
      >
        {/* Breadcrumb */}
        <Link
          href="/discovery"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(255,255,255,0.62)",
            textDecoration: "none",
            marginBottom: 22,
            letterSpacing: "0.02em",
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.62)"; }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Discovery
        </Link>

        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <span
            style={{
              fontSize: "clamp(40px, 6vw, 60px)",
              lineHeight: 1,
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.5))",
            }}
          >
            {subject.icon}
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 5vw, 50px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#fff",
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            {subject.title}
          </h1>
        </div>

        <p
          style={{
            margin: "0 0 22px",
            fontSize: "clamp(14px,1.8vw,17px)",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.72)",
            maxWidth: 580,
          }}
        >
          {subject.heroSubhead}
        </p>

        {/* Stat chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
            }}
          >
            {totalItems} items
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
            }}
          >
            {subject.subtopics.length} subtopics
          </span>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid rgba(74,222,128,0.3)",
              background: "rgba(20,83,45,0.45)",
              backdropFilter: "blur(6px)",
              fontSize: 11, fontWeight: 700, color: "#4ade80",
              letterSpacing: "0.02em",
            }}
          >
            <ShieldCheck style={{ width: 11, height: 11 }} />
            Safe View
          </span>
        </div>
      </div>
    </div>
  );
}
