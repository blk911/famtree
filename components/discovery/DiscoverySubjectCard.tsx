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
          background: "#ffffff",
          border: "1px solid rgba(28,25,23,0.08)",
          boxShadow: "0 1px 6px rgba(28,25,23,0.05)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-5px)";
          el.style.boxShadow = "0 16px 44px rgba(28,25,23,0.13)";
          el.style.borderColor = "rgba(28,25,23,0.14)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 1px 6px rgba(28,25,23,0.05)";
          el.style.borderColor = "rgba(28,25,23,0.08)";
        }}
      >
        {/* Gradient header */}
        <div
          style={{
            background: subject.thumbGradient,
            padding: "24px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minHeight: 112,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 42, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>
            {subject.icon}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              textShadow: "0 2px 12px rgba(0,0,0,0.35)",
              minWidth: 0,
            }}
          >
            {subject.title}
          </h2>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "12px 20px 18px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 16,
              lineHeight: 1.55,
              color: "rgba(28,25,23,0.52)",
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
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
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
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
                  color: "rgba(28,25,23,0.38)",
                  borderRadius: 6, padding: "2px 8px",
                  border: "1px solid rgba(28,25,23,0.12)",
                }}
              >
                +{subject.subtopics.length - 3}
              </span>
            )}
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: "rgba(28,25,23,0.40)",
                  textTransform: "uppercase",
                }}
              >
                {totalItems} items
              </span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(28,25,23,0.18)" }} />
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "#16a34a",
                }}
              >
                <ShieldCheck style={{ width: 11, height: 11 }} />
                Safe View
              </span>
            </div>

            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em",
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
