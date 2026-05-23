import type { Metadata } from "next";
import Link from "next/link";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { GapUSubpageBackLink, GapUSubpageChrome } from "@/components/studios/gapu/GapUSubpageChrome";

export const metadata: Metadata = {
  title: "Family-led learning — Gap U Studios",
  description:
    "Design private homeschool pods with parent coordination, trusted tutors, and guardian-safe Spaces instead of fragmented group chats.",
};

export default function GapUFamilyLedPage() {
  return (
    <>
      <GapUSubpageChrome />
      <div className="gapu-page">
        <GapUSubpageBackLink />
        <header style={{ marginBottom: 28 }}>
          <p className="gapu-eyebrow" style={{ textAlign: "left", marginBottom: 10 }}>
            Pillar 1 · Family-led learning
          </p>
          <h1 className="gapu-headline" style={{ textAlign: "left", fontSize: "clamp(24px, 3.3vw, 34px)", marginBottom: 12 }}>
            Build a private learning pod
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#57534e", maxWidth: 720 }}>
            Pods are intentionally small units of accountability: parents nominate stewards, tutors stay inside scoped threads, minors never get
            shoved into trending feeds just to coordinate homework.
          </p>
        </header>

        <section className="gapu-roadmap-phase" aria-labelledby="fl-how">
          <h3 id="fl-how">What we optimize for</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Ritual vs. scrolling:</strong> weekly cadence publishes to people who opted in — not inferred audiences.
            </li>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Parent sovereignty:</strong> guardians keep veto + visibility over tutor notes, outings, lab permissions.
            </li>
            <li style={{ marginBottom: "0.65rem" }}>
              <strong>Trusted tutors:</strong> rostered humans with relationship history, governed messaging, escalation paths — not searchable public
              profiles.
            </li>
          </ul>
        </section>

        <section className="gapu-roadmap-phase" aria-labelledby="fl-next">
          <h3 id="fl-next">What happens after you anchor a pod?</h3>
          <p className="gapu-roadmap-phase-summary">
            Steward teams layering <Link href="/studios/gap-u/business-tracks">business tracks</Link> for apprentices or accelerating into the{' '}
            <Link href="/studios/gap-u/program">Gap U pillar</Link> roadmap happens without breaking privacy rules — Spaces stay partitioned.
          </p>
          <Link href="/studios/gap-u/roadmap" className="gapu-pathway-cta">
            View roadmap sample
          </Link>
        </section>
      </div>
      <StudiosFooter />
    </>
  );
}
