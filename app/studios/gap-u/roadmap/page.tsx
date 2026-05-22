import type { Metadata } from "next";

import { GAP_U_ROADMAP } from "@/lib/studios/gapu/gapuRoadmapData";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { GapUSubpageBackLink, GapUSubpageChrome } from "@/components/studios/gapu/GapUSubpageChrome";

export const metadata: Metadata = {
  title: "Gap U roadmap — AIH Studios",
  description:
    "Four-phase discovery → direction → execution → obstacle literacy, stewarded inside private Spaces instead of viral feeds.",
};

export default function GapURoadmapPage() {
  return (
    <>
      <GapUSubpageChrome />
      <div className="gapu-page">
        <GapUSubpageBackLink />
        <header style={{ marginBottom: 24 }}>
          <p className="gapu-eyebrow" style={{ textAlign: "left", marginBottom: 8 }}>
            {GAP_U_ROADMAP.programTitle}
          </p>
          <h1 className="gapu-headline" style={{ textAlign: "left", marginBottom: 12 }}>
            Gap U roadmap (full arc)
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#57534e", maxWidth: 720 }}>
            {GAP_U_ROADMAP.sourceNote}
          </p>
        </header>

        <p className="gapu-roadmap-muted" style={{ maxWidth: 720 }}>
          <strong>CMS hook:</strong> data currently ships from{' '}
          <code style={{ fontSize: "0.92em", background: "rgba(28,25,23,0.06)", padding: "2px 6px", borderRadius: 6 }}>
            lib/studios/gapu/gapuRoadmapData.ts
          </code>
          . Replace imports with persisted content when steward tooling is wired.
        </p>

        {GAP_U_ROADMAP.phases.map((phase) => (
          <div key={phase.id} className="gapu-roadmap-phase" id={phase.id}>
            <h3>{phase.title}</h3>
            <p className="gapu-roadmap-phase-summary">{phase.summary}</p>
            {phase.units.map((unit) => (
              <div key={`${phase.id}:${unit.title}`} className="gapu-roadmap-unit">
                <h4>{unit.title}</h4>
                <p>{unit.detail}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <StudiosFooter />
    </>
  );
}
