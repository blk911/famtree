"use client";

import Link from "next/link";
import type { GapUStudioLiveContent } from "@/lib/studios/gapu/types";
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
  const { hero, whyPrivate, sections, announcements, events, resources } = content;

  return (
    <>
      <style>{`
        .gapu-page { max-width: 960px; margin: 0 auto; padding: 0 20px 48px; }
        .gapu-hero {
          padding: clamp(32px, 5vw, 48px) 0 28px;
          text-align: center;
        }
        .gapu-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #9d174d; margin: 0 0 12px;
        }
        .gapu-headline {
          font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: #1c1917;
          letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 14px;
        }
        .gapu-sub { font-size: 16px; line-height: 1.55; color: #57534e; max-width: 640px; margin: 0 auto 20px; }
        .gapu-pillars {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
        }
        .gapu-pillar {
          padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
          background: #fdf2f8; color: #9d174d; border: 1px solid rgba(157, 23, 77, 0.15);
        }
        .gapu-section-title {
          font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 20px;
          letter-spacing: -0.02em;
        }
        .gapu-grid {
          display: grid; gap: 14px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .gapu-card {
          padding: 18px; border-radius: 18px; background: rgba(255,255,255,0.92);
          border: 1px solid rgba(28,25,23,0.08);
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .gapu-card h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #1c1917; }
        .gapu-card p { margin: 0; font-size: 14px; line-height: 1.5; color: #57534e; }
        .gapu-card ul { margin: 10px 0 0; padding-left: 18px; font-size: 13px; color: #78716c; }
        .gapu-why {
          margin: 36px 0; padding: 28px 24px; border-radius: 22px;
          background: linear-gradient(165deg, #fdf2f8 0%, #fafaf9 55%, #f5f2ea 100%);
          border: 1px solid rgba(157, 23, 77, 0.12);
        }
        .gapu-why-point { margin-bottom: 16px; }
        .gapu-why-point h4 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: #44403c; }
        .gapu-why-point p { margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; }
        .gapu-list-item {
          padding: 14px 16px; border-radius: 14px; background: #fff;
          border: 1px solid rgba(28,25,23,0.06); margin-bottom: 10px;
        }
        .gapu-list-meta { font-size: 11px; font-weight: 700; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.06em; }
        .gapu-live-badge {
          display: inline-block; margin-bottom: 24px; padding: 4px 10px; border-radius: 8px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          background: #ecfdf5; color: #047857;
        }
        .gapu-access-bar {
          display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;
          padding: 20px; border-radius: 18px; background: rgba(28,25,23,0.04);
          border: 1px solid rgba(28,25,23,0.08); margin-top: 32px;
        }
        .gapu-access-label { margin: 0; font-size: 13px; font-weight: 700; color: #44403c; }
        .gapu-access-desc { margin: 6px 0 0; font-size: 13px; color: #78716c; max-width: 480px; }
        .gapu-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 700;
          text-decoration: none; border: none; cursor: pointer;
        }
        .gapu-btn-primary { background: #9d174d; color: #fff; }
        .gapu-access-hint { width: 100%; margin: 8px 0 0; font-size: 12px; color: #78716c; }
        .gapu-access-status { text-align: center; font-size: 13px; color: #57534e; margin-top: 12px; }
        .gapu-modal-backdrop {
          position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .gapu-modal {
          width: min(420px, 100%); padding: 22px; border-radius: 18px; background: #fff;
        }
        .gapu-modal-title { margin: 0 0 8px; font-size: 18px; font-weight: 800; }
        .gapu-modal-sub { margin: 0 0 16px; font-size: 13px; color: #78716c; line-height: 1.45; }
        .gapu-back { display: inline-flex; margin-bottom: 16px; font-size: 13px; font-weight: 600; color: #57534e; text-decoration: none; }
      `}</style>

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
          <div className="gapu-pillars">
            {hero.pillars.map((p) => (
              <span key={p} className="gapu-pillar">
                {p}
              </span>
            ))}
          </div>
        </header>

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

        <section aria-labelledby="gapu-core-sections">
          <h2 id="gapu-core-sections" className="gapu-section-title">
            Inside Gap U
          </h2>
          <div className="gapu-grid">
            {sections.map((s) => (
              <article key={s.id} className="gapu-card" id={s.id}>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                {s.bullets?.length ? (
                  <ul>
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 36 }} aria-labelledby="gapu-announcements">
          <h2 id="gapu-announcements" className="gapu-section-title">
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

        <section style={{ marginTop: 36 }} aria-labelledby="gapu-events">
          <h2 id="gapu-events" className="gapu-section-title">
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

        <section style={{ marginTop: 36 }} aria-labelledby="gapu-resources">
          <h2 id="gapu-resources" className="gapu-section-title">
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
