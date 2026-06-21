"use client";

import Link from "next/link";
import type { TodayCommandCenterSnapshot } from "@/lib/vmb/today-command-center";
import { formatTodayMoney } from "@/lib/vmb/today-command-center";

type Props = {
  snapshot: TodayCommandCenterSnapshot;
};

export function TodayCommandCenter({ snapshot }: Props) {
  return (
    <section className="vmb-today-command" aria-label="Today command center">
      <div className="vmb-today-command__head">
        <p className="vmb-today-command__kicker">Daily brief</p>
        <h2 className="vmb-today-command__title">{snapshot.nextActionTitle}</h2>
        <p className="vmb-today-command__lead">
          {snapshot.nextActionDetail}
        </p>
        <Link href={snapshot.primaryCtaHref} className="vmb-today-command__cta">
          {snapshot.primaryCtaLabel}
        </Link>
      </div>

      {snapshot.topOpportunities.length > 0 ? (
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
        <p className="vmb-today-command__empty">No ranked opportunities yet.</p>
      )}
    </section>
  );
}
