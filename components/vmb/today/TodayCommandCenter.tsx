"use client";

import Link from "next/link";
import type { TaikosOpportunity } from "@/lib/taikos/opportunities/types";
import type { TodayCommandCenterSnapshot } from "@/lib/vmb/today-command-center";
import { formatTodayMoney } from "@/lib/vmb/today-command-center";

type Props = {
  snapshot: TodayCommandCenterSnapshot;
  selectedOfferLabel: string;
  selectedOfferRecommendations: TaikosOpportunity[];
};

export function TodayCommandCenter({
  snapshot,
  selectedOfferLabel,
  selectedOfferRecommendations,
}: Props) {
  return (
    <section className="vmb-today-command" aria-label="Invite preview and send workspace">
      <div className="vmb-today-command__head">
        <p className="vmb-today-command__kicker">Invite render + send details</p>
        <h2 className="vmb-today-command__title">Review the invite before it goes out</h2>
        <p className="vmb-today-command__lead">
          Use the focused workbench above to choose a client and touch point, then confirm the rendered invite and
          stubbed send record here.
        </p>
        <Link href={snapshot.primaryCtaHref} className="vmb-today-command__cta">
          Open invite library
        </Link>
      </div>

      <div className="vmb-today-command__send-grid">
        <div className="vmb-today-command__send-card">
          <span>Selected touch point</span>
          <strong>{selectedOfferLabel}</strong>
          <p>Preview opens from the workbench after the client/contact fields are ready.</p>
        </div>
        <div className="vmb-today-command__send-card">
          <span>Send status</span>
          <strong>Internal stub</strong>
          <p>SendGrid/mailto is not live yet; sends are saved as app events.</p>
        </div>
        <div className="vmb-today-command__send-card">
          <span>Matching finds</span>
          <strong>{selectedOfferRecommendations.length}</strong>
          <p>TAIKOS finds are filtered by the selected touch point above.</p>
        </div>
      </div>

      {selectedOfferRecommendations.length > 0 ? (
        <ol className="vmb-today-command__opps">
          {selectedOfferRecommendations.map((opp, index) => (
            <li key={opp.opportunityId}>
              <span className="vmb-today-command__opp-rank">{index + 1}</span>
              <span className="vmb-today-command__opp-title">{opp.title}</span>
              <span className="vmb-today-command__opp-value">
                {formatTodayMoney(opp.estimatedValue)}
              </span>
            </li>
          ))}
        </ol>
      ) : snapshot.topOpportunities.length > 0 ? (
        <ol className="vmb-today-command__opps">
          {snapshot.topOpportunities.map((opp, index) => (
            <li key={opp.opportunityId}>
              <span className="vmb-today-command__opp-rank">{index + 1}</span>
              <span className="vmb-today-command__opp-title">{opp.title}</span>
              <span className="vmb-today-command__opp-value">
                {formatTodayMoney(opp.estimatedValue)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="vmb-today-command__empty">No invite opportunities are queued yet.</p>
      )}
    </section>
  );
}
