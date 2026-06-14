"use client";

import { useMemo, useState } from "react";
import type { CodaSearchResult, CodaSummary } from "@/lib/taikos/coda/types";
import { SALON_QA_SUGGESTED_CHIPS } from "@/lib/taikos/salon-qa/salon-query-catalog";
import type { SalonQaAnswer, TodayActiveQuestionResult } from "@/lib/taikos/salon-qa/types";
import {
  buildTodayConversationLines,
  buildTodayGreeting,
  relationshipOpportunityCount,
} from "@/lib/taikos/context/today-conversation";

type Props = {
  coda: CodaSummary;
  operatorName?: string;
  salonName?: string;
  analysisId?: string;
  onQuestionAnswer?: (answer: TodayActiveQuestionResult) => void;
  onPreviewFirstCard?: () => void;
};

export function TodayCodaBanner({
  coda,
  operatorName,
  salonName,
  analysisId,
  onQuestionAnswer,
  onPreviewFirstCard,
}: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [legacyResults, setLegacyResults] = useState<CodaSearchResult | null>(null);
  const [qaAnswer, setQaAnswer] = useState<SalonQaAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headline = useMemo(
    () => buildTodayGreeting(operatorName ?? coda.context?.ownerName, salonName),
    [operatorName, salonName, coda.context?.ownerName],
  );
  const count = relationshipOpportunityCount(coda);
  const focusLabel = coda?.objective?.label ?? "Make today's relationship moves";
  const conversationLines = useMemo(() => buildTodayConversationLines(coda), [coda]);

  async function runSalonQa(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setLegacyResults(null);
    try {
      const res = await fetch("/api/taikos/salon-qa", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, analysisId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: SalonQaAnswer;
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        if (json.error === "NO_ACTIVE_BOOK") {
          setError(json.message ?? "Upload or load a client book first.");
        } else {
          setError(json.message ?? json.error ?? "Could not answer that question.");
        }
        setQaAnswer(null);
        return;
      }
      setQaAnswer(json.data);
      onQuestionAnswer?.(json.data);
    } catch {
      setError("Could not answer that question.");
      setQaAnswer(null);
    } finally {
      setSearching(false);
    }
  }

  async function runLegacySearch(trimmed: string) {
    const res = await fetch("/api/taikos/coda/search", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });
    const json = (await res.json()) as { ok: boolean; data?: CodaSearchResult; error?: string };
    if (!res.ok || !json.ok || !json.data) {
      setLegacyResults(null);
      return;
    }
    setLegacyResults(json.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    await runSalonQa(trimmed);
    if (trimmed.length <= 24) {
      await runLegacySearch(trimmed);
    }
  }

  function handleChipClick(example: string) {
    setQuery(example);
    void runSalonQa(example);
  }

  const canPreviewCard = (qaAnswer?.suggestedCards.length ?? 0) > 0;

  return (
    <section className="vmb-today-coda-banner">
      <div className="vmb-today-coda-banner__content">
        <p className="vmb-today-coda-banner__hello">{headline}</p>
        <p className="vmb-today-coda-banner__summary">
          I found {count} relationship {count === 1 ? "opportunity" : "opportunities"} worth your
          attention.
        </p>
        <div className="vmb-today-coda-banner__focus">
          <p className="vmb-today-coda-banner__focus-label">Today&apos;s focus:</p>
          <p className="vmb-today-coda-banner__focus-value">{focusLabel}</p>
        </div>
        <div className="vmb-today-coda-banner__conversation">
          {conversationLines.map((line) => (
            <p key={line} className="vmb-today-coda-banner__conversation-line">
              {line}
            </p>
          ))}
        </div>

        {error ? <p className="taikos-inline-workflow__error">{error}</p> : null}

        {qaAnswer ? (
          <div className="vmb-salon-qa-answer">
            <p className="vmb-salon-qa-answer__headline">{qaAnswer.headline}</p>
            <p className="vmb-salon-qa-answer__text">{qaAnswer.answerText}</p>
            {qaAnswer.results.length > 0 ? (
              <ol className="vmb-salon-qa-answer__results">
                {qaAnswer.results.map((result, index) => (
                  <li key={`${result.clientName}-${index}`}>
                    <strong>{result.clientName}</strong>
                    <span> — {result.reason}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {canPreviewCard ? (
              <button
                type="button"
                className="vmb-salon-qa-answer__action vmb-salon-qa-answer__action--live"
                onClick={() => onPreviewFirstCard?.()}
              >
                Preview Card
              </button>
            ) : null}
            <p className="vmb-salon-qa-answer__followup">{qaAnswer.followUpPrompt}</p>
          </div>
        ) : null}

        {legacyResults && legacyResults.matches.length > 0 && !canPreviewCard ? (
          <div className="vmb-today-coda-banner__results">
            <p className="vmb-today-coda-banner__results-label">From your book</p>
            <ul className="vmb-today-coda-banner__results-list">
              {legacyResults.matches.map((match) => (
                <li key={match.clientName}>
                  <strong>{match.clientName}</strong>
                  <span> · {match.matchReason}</span>
                  {match.lastService ? <span> · {match.lastService}</span> : null}
                  {match.lastVisit ? <span> · {match.lastVisit}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {legacyResults && legacyResults.matches.length === 0 && !qaAnswer ? (
          <p className="vmb-today-coda-banner__no-results">No matches in your book for that question.</p>
        ) : null}
      </div>

      <form className="vmb-today-coda-banner__search" onSubmit={(e) => void handleSubmit(e)}>
        <label className="vmb-today-coda-banner__search-label" htmlFor="today-coda-search">
          What else are you thinking about?
        </label>
        <div className="vmb-today-coda-banner__chips">
          {SALON_QA_SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="vmb-salon-qa-chip"
              disabled={searching}
              onClick={() => handleChipClick(chip.example)}
            >
              {chip.example}
            </button>
          ))}
        </div>
        <div className="vmb-today-coda-banner__search-row">
          <input
            id="today-coda-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Who should join my PCN? Who gets Gel-X? Who is overdue?"
            className="vmb-today-coda-banner__input"
          />
          <button type="submit" className="taikos-opp-card__cta" disabled={searching || !query.trim()}>
            {searching ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>
    </section>
  );
}
