"use client";

import Link from "next/link";
import type { GapUStudioLiveContent } from "@/lib/studios/gapu/types";
import { GAP_U_ROADMAP } from "@/lib/studios/gapu/gapuRoadmapData";
import { GAP_U_SURFACE_CSS } from "@/lib/studios/gapu/gapuSurfaceCss";
import { GapUAccessBar } from "@/components/studios/gapu/GapUAccessBar";

type Props = {
  content: GapUStudioLiveContent;
  isAuthenticated: boolean;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function GapUStudioPage({ content, isAuthenticated }: Props) {
  const { hero, whyPrivate, pathways, roadmapPreview, announcements, events, resources } =
    content;

  const previewPhases = GAP_U_ROADMAP.phases.slice(0, 3);

  return (
    <>
      <style>{GAP_U_SURFACE_CSS}</style>

      <div className="gapu-page">
        <Link href="/studios" className="gapu-back">
          ← AIH Studios
        </Link>
        <span className="gapu-live-badge">Flagship live Studio · {content.source} v{content.version}</span>

        <header className="gapu-hero">
          <p className="gapu-eyebrow">{hero.eyebrow}</p>
          <h1 className="gapu-headline">{hero.headline}</h1>
          {hero.subcopy.map((line) => (
            <p key={line} className="gapu-sub">
              {line}
            </p>
          ))}
        </header>

        <section aria-labelledby="gapu-pathways">
          <h2 id="gapu-pathways" className="gapu-section-title">
            Three pathways in one trusted Studio
          </h2>
          <div className="gapu-pathway-grid">
            {pathways.map((path) => (
              <article key={path.id} className="gapu-pathway-card">
                <p className="gapu-pathway-badge">{path.pillarLabel}</p>
                <h3 className="gapu-pathway-title">{path.title}</h3>
                <p className="gapu-pathway-lede">{path.lede}</p>
                <ul style={{ margin: "0 0 14px", paddingLeft: "18px", fontSize: 13, color: "#78716c" }}>
                  {path.bullets.map((b) => (
                    <li key={b} style={{ marginBottom: 6 }}>
                      {b}
                    </li>
                  ))}
                </ul>
                <Link href={path.href} className="gapu-pathway-cta">
                  {path.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="gapu-why" aria-labelledby="gapu-why-title">
          <h2 id="gapu-why-title" className="gapu-section-title">
            {whyPrivate.title}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 15, color: "#57534e", lineHeight: 1.55 }}>{whyPrivate.intro}</p>
          {whyPrivate.points.map((pt) => (
            <div key={pt.title} className="gapu-why-point">
              <h4>{pt.title}</h4>
              <p>{pt.body}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="gapu-roadmap-preview">
          <h2 id="gapu-roadmap-preview" className="gapu-section-title">
            {roadmapPreview.title}
          </h2>
          <p className="gapu-roadmap-muted">{roadmapPreview.intro}</p>

          <div style={{ marginBottom: 18 }}>
            {previewPhases.map((phase) => (
              <div key={phase.id} className="gapu-roadmap-phase">
                <h3>{phase.title}</h3>
                <p className="gapu-roadmap-phase-summary">{phase.summary}</p>
                {phase.units.slice(0, 2).map((unit) => (
                  <div key={unit.title} className="gapu-roadmap-unit">
                    <h4>{unit.title}</h4>
                    <p>{unit.detail}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Link href="/studios/gap-u/roadmap" className="gapu-pathway-cta">
              Open full roadmap
            </Link>
            <Link href="/studios/gap-u/program" className="gapu-btn gapu-btn-ghost">
              Gap U pillar detail
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 40 }} aria-labelledby="gapu-pulse-title">
          <h2 id="gapu-pulse-title" className="gapu-section-title">
            Signals inside the live Studio
          </h2>
          <p style={{ margin: "-8px 0 16px", fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
            Steward notices, RSVP blocks, and field notes stay private to invites — this is illustrative mock data until feeds
            connect to CMS.
          </p>
        </section>

        <section aria-labelledby="gapu-announcements">
          <h2 id="gapu-announcements" className="gapu-section-title" style={{ fontSize: "18px" }}>
            Announcements
          </h2>
          {announcements.map((a) => (
            <div key={a.id} className="gapu-list-item">
              <p className="gapu-list-meta">
                {formatDate(a.postedAt)} · {a.audience}
              </p>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>{a.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#57534e", lineHeight: 1.5 }}>{a.body}</p>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 28 }} aria-labelledby="gapu-events">
          <h2 id="gapu-events" className="gapu-section-title" style={{ fontSize: "18px" }}>
            Events & workshops
          </h2>
          {events.map((e) => (
            <div key={e.id} className="gapu-list-item">
              <p className="gapu-list-meta">
                {formatDate(e.startsAt)} · {e.access} access
              </p>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800 }}>{e.title}</h3>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#78716c" }}>{e.location}</p>
              <p style={{ margin: 0, fontSize: 14, color: "#57534e" }}>{e.description}</p>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 28 }} aria-labelledby="gapu-resources">
          <h2 id="gapu-resources" className="gapu-section-title" style={{ fontSize: "18px" }}>
            Resource vault
          </h2>
          <div className="gapu-grid">
            {resources.map((r) => (
              <article key={r.id} className="gapu-card">
                <p className="gapu-list-meta">{r.type}</p>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
              </article>
            ))}
          </div>
        </section>

        <GapUAccessBar isAuthenticated={isAuthenticated} />
      </div>
    </>
  );
}
