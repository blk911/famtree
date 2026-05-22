import type { Metadata } from "next";
import Link from "next/link";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { GapUSubpageBackLink, GapUSubpageChrome } from "@/components/studios/gapu/GapUSubpageChrome";

export const metadata: Metadata = {
  title: "Gap U pillar — invention + six-year roadmap",
  description:
    "Post-grad invention labs, tooling literacy, and the six-year capability arc—hosted inside stewarded AIH Spaces.",
};

export default function GapUProgramPage() {
  return (
    <>
      <GapUSubpageChrome />
      <div className="gapu-page">
        <GapUSubpageBackLink />
        <header style={{ marginBottom: 28 }}>
          <p className="gapu-eyebrow" style={{ textAlign: "left", marginBottom: 10 }}>
            Pillar 3 · Gap U
          </p>
          <h1 className="gapu-headline" style={{ textAlign: "left", fontSize: "clamp(24px, 3.3vw, 34px)", marginBottom: 12 }}>
            Enter Gap U — high school graduation is a milestone, not a finish line
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#57534e", maxWidth: 720 }}>
            Gap U sequences identity work, directional forums, disciplined execution drills, and obstacle literacy—the same philosophical spine preserved
            from the archival MLP curriculum, now articulated for AIH stewardship instead of standalone registration microsites.
          </p>
        </header>

        <section className="gapu-roadmap-phase" aria-labelledby="pillar-map">
          <h3 id="pillar-map">Six-year capability roadmap (preview framing)</h3>
          <p className="gapu-roadmap-phase-summary">
            Years 1–2 emphasize reflection + prototyping inside safe cohorts; 3–4 stress field deployments with guardian checkpoints; 5–6 apprentice
            leadership + mentor reciprocity — always with invention lab safety tiers and tooling audits.
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: 14, color: "#57534e", lineHeight: 1.6 }}>
            <li style={{ marginBottom: "0.65rem" }}>Hybrid AI literacy: prompting, retrieval hygiene, embodied ethics reviews.</li>
            <li style={{ marginBottom: "0.65rem" }}>
              Hands-on fabrication + electronics tracks with stewardship sign-offs—not anonymous maker accounts.
            </li>
            <li style={{ marginBottom: "0.65rem" }}>
              Integrated systems thinking bridging community care, civic interfaces, and light engineering rigor.
            </li>
          </ul>
        </section>

        <section className="gapu-roadmap-phase" aria-labelledby="pillar-route">
          <h3 id="pillar-route">Next step inside this Studio shell</h3>
          <p className="gapu-roadmap-phase-summary">
            Read the complete staged arc on the roadmap page while stewards finalize Space templates and pod intake policies.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/studios/gap-u/roadmap" className="gapu-pathway-cta">
              Open roadmap
            </Link>
            <Link href="/studios/gap-u/family-led-learning" className="gapu-btn gapu-btn-ghost">
              Anchor a family pod first
            </Link>
          </div>
        </section>
      </div>
      <StudiosFooter />
    </>
  );
}
