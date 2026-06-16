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
        <h2 className="vmb-today-command__title">Command center</h2>
        <p className="vmb-today-command__lead">
          Your book, the money VMB found, and what to do next.
        </p>
      </div>

      <div className="vmb-today-command__grid">
        <article className="vmb-today-command__card">
          <p className="vmb-today-command__eyebrow">Book status</p>
          <p className="vmb-today-command__value vmb-today-command__value--success">
            {snapshot.bookStatusLabel}
          </p>
          <p className="vmb-today-command__meta">
            {snapshot.analyzedClientCount > 0
              ? `${snapshot.analyzedClientCount.toLocaleString()} client${
                  snapshot.analyzedClientCount === 1 ? "" : "s"
                } analyzed`
              : "Analysis connected to your workspace"}
          </p>
        </article>

        <article className="vmb-today-command__card">
          <p className="vmb-today-command__eyebrow">Money found</p>
          <p className="vmb-today-command__value">
            {snapshot.totalOpportunities.toLocaleString()} opportunit
            {snapshot.totalOpportunities === 1 ? "y" : "ies"}
          </p>
          <p className="vmb-today-command__meta">
            {snapshot.highPriorityCount > 0
              ? `${snapshot.highPriorityCount} high priority`
              : "Ranked from your loaded book"}
          </p>
          {snapshot.topOpportunities.length > 0 ? (
            <ol className="vmb-today-command__opps">
              {snapshot.topOpportunities.map((opp, index) => (
                <li key={opp.opportunityId}>
                  <span className="vmb-today-command__opp-rank">{index + 1}.</span>
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
        </article>

        <article className="vmb-today-command__card vmb-today-command__card--action">
          <p className="vmb-today-command__eyebrow">Next action</p>
          <p className="vmb-today-command__action-title">{snapshot.nextActionTitle}</p>
          <p className="vmb-today-command__meta">{snapshot.nextActionDetail}</p>
          <Link href={snapshot.primaryCtaHref} className="vmb-today-command__cta">
            {snapshot.primaryCtaLabel}
          </Link>
        </article>

        <article className="vmb-today-command__card">
          <p className="vmb-today-command__eyebrow">Queue &amp; drafts</p>
          <div className="vmb-today-command__counts">
            <div>
              <span className="vmb-today-command__count-value">{snapshot.queuePendingCount}</span>
              <span className="vmb-today-command__count-label">In queue</span>
            </div>
            <div>
              <span className="vmb-today-command__count-value">{snapshot.inviteDraftSummary.totalOpenDrafts}</span>
              <span className="vmb-today-command__count-label">Open invite drafts</span>
            </div>
          </div>
          {(snapshot.inviteDraftSummary.vmbDraftCount > 0 ||
            snapshot.inviteDraftSummary.taikosDraftCount > 0) && (
            <p className="vmb-today-command__meta">
              {snapshot.inviteDraftSummary.vmbDraftCount > 0
                ? `${snapshot.inviteDraftSummary.vmbDraftCount} VMB`
                : null}
              {snapshot.inviteDraftSummary.vmbDraftCount > 0 &&
              snapshot.inviteDraftSummary.taikosDraftCount > 0
                ? " · "
                : null}
              {snapshot.inviteDraftSummary.taikosDraftCount > 0
                ? `${snapshot.inviteDraftSummary.taikosDraftCount} tAIkOS`
                : null}
              {snapshot.inviteDraftSummary.sentCount > 0
                ? ` · ${snapshot.inviteDraftSummary.sentCount} sent`
                : null}
            </p>
          )}
          <div className="vmb-today-command__links">
            <Link href={snapshot.queueCtaHref} className="vmb-today-command__link">
              Open queue
            </Link>
            <Link href={snapshot.invitesCtaHref} className="vmb-today-command__link">
              Review invites
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
