"use client";

import Link from "next/link";
import type { AiosAction, AiosResponse } from "@/lib/taikos/types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  open: boolean;
  response: AiosResponse | null;
  loading?: boolean;
  onClose: () => void;
  onInteraction: () => void;
};

function ActionButton({ action, onClick }: { action: AiosAction; onClick: () => void }) {
  if (action.href) {
    return (
      <Link
        href={action.href}
        onClick={onClick}
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 10,
          border: `1px solid ${VMB_THEME.line}`,
          background: "#fff",
          fontSize: 13,
          fontWeight: 700,
          color: VMB_THEME.accent,
          textDecoration: "none",
        }}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
        fontSize: 13,
        fontWeight: 700,
        color: VMB_THEME.accent,
        cursor: "pointer",
      }}
    >
      {action.label}
    </button>
  );
}

export function AiosPanel({ open, response, loading, onClose, onInteraction }: Props) {
  if (!open) return null;

  return (
    <div className="aios-panel-backdrop" role="presentation" onClick={onClose}>
      <div
        className="aios-panel"
        role="dialog"
        aria-label="tAIkOS"
        onClick={(e) => {
          e.stopPropagation();
          onInteraction();
        }}
      >
        <header className="aios-panel__header">
          <div>
            <p className="aios-panel__eyebrow">tAIkOS</p>
            <p className="aios-panel__mode">
              {response?.mode === "briefing"
                ? "Morning briefing"
                : response?.mode === "page-assistant"
                  ? "Page assistant"
                  : response?.mode === "idle-summary"
                    ? "Week summary"
                    : "Concierge"}
            </p>
          </div>
          <button type="button" className="aios-panel__close" onClick={onClose} aria-label="Close tAIkOS">
            ×
          </button>
        </header>

        {loading ? (
          <p className="aios-panel__loading">Preparing your operating brief…</p>
        ) : response ? (
          <div className="aios-panel__body">
            {response.greeting ? <h2 className="aios-panel__greeting">{response.greeting}</h2> : null}
            {response.pageContextLine ? (
              <p className="aios-panel__context-line">{response.pageContextLine}</p>
            ) : null}
            <p className="aios-panel__summary" style={{ whiteSpace: "pre-wrap" }}>
              {response.summary}
            </p>

            {response.opportunities.length > 0 ? (
              <section className="aios-panel__section">
                <h3>Opportunities</h3>
                <ul className="aios-panel__list">
                  {response.opportunities.slice(0, 4).map((opp) => (
                    <li key={opp.id}>
                      <strong>{opp.title}</strong>
                      <span>{opp.description}</span>
                      {opp.estimatedValue > 0 ? (
                        <em>+${opp.estimatedValue.toLocaleString()}</em>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {response.recommendations.length > 0 ? (
              <section className="aios-panel__section">
                <h3>Recommendations</h3>
                <ul className="aios-panel__bullets">
                  {response.recommendations.slice(0, 4).map((rec, i) => (
                    <li key={`rec-${i}`}>{rec}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {response.estimatedValue > 0 ? (
              <p className="aios-panel__value">
                Estimated opportunity value: <strong>+${response.estimatedValue.toLocaleString()}</strong>
              </p>
            ) : null}

            {response.followUpPrompt ? (
              <p className="aios-panel__followup">{response.followUpPrompt}</p>
            ) : null}

            {response.cards[0]?.actions && response.cards[0].actions.length > 0 ? (
              <div className="aios-panel__actions">
                {response.cards[0].actions.map((action) => (
                  <ActionButton key={action.id} action={action} onClick={onInteraction} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="aios-panel__loading">Connect your book to unlock tAIkOS.</p>
        )}
      </div>
    </div>
  );
}
