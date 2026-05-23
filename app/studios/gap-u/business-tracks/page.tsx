import type { Metadata } from "next";
import Link from "next/link";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { GapUSubpageBackLink, GapUSubpageChrome } from "@/components/studios/gapu/GapUSubpageChrome";

export const metadata: Metadata = {
  title: "Real-world business tracks — Gap U Studios",
  description:
    "Operator-informed tracks for tradespeople, founders, and local commerce — ingestion exercises and mentor-guided debriefs in private Spaces.",
};

export default function GapUBusinessTracksPage() {
  return (
    <>
      <GapUSubpageChrome />
      <div className="gapu-page">
        <GapUSubpageBackLink />
        <header style={{ marginBottom: 28 }}>
          <p className="gapu-eyebrow" style={{ textAlign: "left", marginBottom: 10 }}>
            Pillar 2 · Real-world business tracks
          </p>
          <h1 className="gapu-headline" style={{ textAlign: "left", fontSize: "clamp(24px, 3.3vw, 34px)", marginBottom: 12 }}>
            Explore business tracks
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#57534e", maxWidth: 720 }}>
            This pillar treats businesses as living systems—not slide decks. Learners ingest real operator transcripts, teardown local logistics,
            and practice answer hygiene so AI assistance augments discernment rather than laundering guesses.
          </p>
        </header>

        <section className="gapu-roadmap-phase" aria-labelledby="bt-structure">
          <h3 id="bt-structure">Track ingredients</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Operator knowledge:</strong> rotating mentors from trades, storefronts, and founder labs document how decisions actually ship.
            </li>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Ingest → challenge loop:</strong> learners summarize constraints, cite evidence, rehearse objections—before generative tooling
              writes anything persuasive.
            </li>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Local fidelity:</strong> cohorts prioritize zip-code grounded problems so theory meets permitting, staffing, seasonal cash
              rhythms.
            </li>
          </ul>
          <p className="gapu-roadmap-muted" style={{ marginTop: 16 }}>
            AIH Gap U deliberately avoids storefronts, carts, or multi-party billing inside this flagship page—commerce stays external while the Studio
            hosts trust, permissions, and human review.
          </p>
        </section>

        <section className="gapu-roadmap-phase" aria-labelledby="bt-cross">
          <h3 id="bt-cross">Cross-link with other pillars</h3>
          <p className="gapu-roadmap-phase-summary">
            Micro-enterprises seeded inside <Link href="/studios/gap-u/program">Gap U cohort projects</Link> can route younger learners through{' '}
            <Link href="/studios/gap-u/family-led-learning">guardian-mediated pods</Link> so exposure stays proportional to maturity + consent.
          </p>
          <Link href="/studios/gap-u/roadmap" className="gapu-pathway-cta">
            See staged execution arcs
          </Link>
        </section>
      </div>
      <StudiosFooter />
    </>
  );
}
