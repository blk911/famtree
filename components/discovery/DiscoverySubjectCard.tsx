"use client";
// components/discovery/DiscoverySubjectCard.tsx
// Portal card for the Discovery home page subject grid.
// Navigates to the subject page on click — does NOT dump content inline.

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Subject } from "@/lib/discovery/types";

interface Props {
  subject: Subject;
}

export function DiscoverySubjectCard({ subject }: Props) {
  const totalItems = subject.featuredItems.length + subject.projects.length + subject.trails.length;

  return (
    <Link
      href={`/discovery/${subject.slug}`}
      style={{ textDecoration: "none", display: "block" }}
      aria-label={`Explore ${subject.title}`}
    >
      <article
        style={{
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-5px)";
          el.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
          el.style.borderColor = "rgba(255,255,255,0.16)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "none";
          el.style.borderColor = "rgba(255,255,255,0.07)";
        }}
      >
        {/* Gradient header */}
        <div
          style={{
            background: subject.thumbGradient,
            padding: "28px 24px 22px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            minHeight: 110,
            position: "relative",
          }}
        >
          {/* Icon */}
          <span style={{ fontSize: 44, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>
            {subject.icon}
          </span>

          {/* Item count chip */}
          <span
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.72)",
              background: "rgba(0,0,0,0.38)",
              borderRadius: 20, padding: "4px 10px",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(6px)",
            }}
          >
            {totalItems} items
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "16px 20px 20px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <h2
            style={{
              margin: "0 0 7px",
              fontSize: 17,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            {subject.title}
          </h2>

          <p
            style={{
              margin: "0 0 14px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.48)",
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {subject.subhead}
          </p>

          {/* Subtopic pills — first 3 */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
            {subject.subtopics.slice(0, 3).map((st) => (
              <span
                key={st.id}
                style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.02em",
                  color: subject.accentColor,
                  background: `${subject.accentColor}18`,
                  borderRadius: 6, padding: "2px 8px",
                  border: `1px solid ${subject.accentColor}28`,
                }}
              >
                {st.label}
              </span>
            ))}
            {subject.subtopics.length > 3 && (
              <span
                style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.02em",
                  color: "rgba(255,255,255,0.32)",
                  borderRadius: 6, padding: "2px 8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                +{subject.subtopics.length - 3}
              </span>
            )}
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "#4ade80",
              }}
            >
              <ShieldCheck style={{ width: 11, height: 11 }} />
              Safe View
            </span>

            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 800, letterSpacing: "-0.01em",
                color: subject.accentColor,
              }}
            >
              Explore
              <ArrowRight style={{ width: 13, height: 13 }} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
