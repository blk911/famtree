"use client";

import { useEffect, useMemo, useState } from "react";
import type { CodaSearchResult, CodaSummary } from "@/lib/taikos/coda/types";
import { SALON_QA_SUGGESTED_CHIPS, salonQaModeBadge } from "@/lib/taikos/salon-qa/salon-query-catalog";
import { salonQaBoundaryBadge } from "@/lib/taikos/salon-qa/boundary-policy";
import {
  followUpQueryFromAction,
  normalizeSalonQaSuggestedAction,
} from "@/lib/taikos/salon-qa/salon-qa-action-utils";
import type {
  SalonQaAnswer,
  SalonQaPreviewCardAction,
  SalonQaSuggestedAction,
  TodayActiveQuestionResult,
} from "@/lib/taikos/salon-qa/types";
import {
  buildTodayConversationLines,
  buildTodayGreeting,
  relationshipOpportunityCount,
} from "@/lib/taikos/context/today-conversation";

export const TODAY_CODA_SEARCH_INPUT_ID = "today-coda-search";

type Props = {
  coda: CodaSummary;
  operatorName?: string;
  salonName?: string;
  analysisId?: string;
  showAskReminder?: boolean;
  onQuestionAnswer?: (answer: TodayActiveQuestionResult) => void;
  onPreviewFirstCard?: () => void;
  onPreviewSuggestedCard?: (action: SalonQaPreviewCardAction) => void;
  onSubmitFollowUp?: (question: string) => void;
  onAnswerActiveChange?: (active: boolean) => void;
  onLaunchNewClientOffer?: () => void;
};

export function TodayCodaBanner({
  coda,
  operatorName,
  salonName,
  analysisId,
  showAskReminder = false,
  onQuestionAnswer,
  onPreviewFirstCard,
  onPreviewSuggestedCard,
  onSubmitFollowUp,
  onAnswerActiveChange,
  onLaunchNewClientOffer,
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
  const focusBullets = useMemo(
    () => [
      `${count} relationship ${count === 1 ? "opportunity is" : "opportunities are"} ready for review.`,
      `Today's focus: ${focusLabel}.`,
      conversationLines[0] ?? "Start with the client most likely to respond.",
      conversationLines[1] ?? "Use the guide to collect what you need before sending.",
    ],
    [conversationLines, count, focusLabel],
  );

  const resolvedAction = useMemo(
    () => normalizeSalonQaSuggestedAction(qaAnswer?.suggestedAction),
    [qaAnswer?.suggestedAction],
  );

  useEffect(() => {
    onAnswerActiveChange?.(!!qaAnswer);
  }, [qaAnswer, onAnswerActiveChange]);

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
      setQuery(trimmed);
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

  function handleSuggestedAction(action: SalonQaSuggestedAction) {
    if (action.kind === "preview_card") {
      onPreviewSuggestedCard?.(action);
      return;
    }
    const followUp = followUpQueryFromAction(action);
    if (followUp) {
      setQuery(followUp);
      onSubmitFollowUp?.(followUp);
      void runSalonQa(followUp);
    }
  }

  const canPreviewOpportunityCard =
    qaAnswer?.queryMode === "opportunity" && (qaAnswer?.suggestedCards.length ?? 0) > 0;

  return (
    <section className="vmb-today-coda-banner">
      <div className="vmb-today-coda-banner__content">
        <p className="vmb-today-coda-banner__hello">{headline}</p>
        <ul className="vmb-today-coda-banner__focus-list">
          {focusBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="vmb-today-invite-composer__instant vmb-today-coda-banner__new-client">
          <button
            type="button"
            className="vmb-today-invite-composer__primary"
            onClick={() => onLaunchNewClientOffer?.()}
          >
            New Client Offer
          </button>
          <p>Open the complete offer preview before saving the internal invite.</p>
        </div>
      </div>

      <form className="vmb-today-coda-banner__search" onSubmit={(e) => void handleSubmit(e)}>
        <div className="vmb-today-coda-banner__search-head">
          <label className="vmb-today-coda-banner__search-label" htmlFor="today-coda-search">
            What else are you thinking about?
          </label>
          {showAskReminder ? (
            <button
              type="button"
              className="vmb-taikos-ask-reminder vmb-taikos-ask-reminder--inline"
              onClick={() => document.getElementById(TODAY_CODA_SEARCH_INPUT_ID)?.focus()}
            >
              ✨ Ask TAIKOS about your business
            </button>
          ) : null}
        </div>
        <div className="vmb-today-coda-banner__chips vmb-today-coda-banner__chips--scroll">
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
            id={TODAY_CODA_SEARCH_INPUT_ID}
            type="search"
            data-launch-target="taikos-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Who should join my PCN? Who gets Gel-X? Who is overdue?"
            className="vmb-today-coda-banner__input"
          />
          <button type="submit" className="taikos-opp-card__cta" disabled={searching || !query.trim()}>
            {searching ? "Thinking…" : "Ask"}
          </button>
        </div>
        {error ? <p className="taikos-inline-workflow__error">{error}</p> : null}

        {qaAnswer ? (
          <div className="vmb-salon-qa-answer">
            {qaAnswer.boundary ? (
              <p className={`vmb-salon-qa-answer__boundary vmb-salon-qa-answer__boundary--${qaAnswer.boundary}`}>
                {salonQaBoundaryBadge(qaAnswer.boundary)}
              </p>
            ) : (
              <p className="vmb-salon-qa-answer__mode">{salonQaModeBadge(qaAnswer.queryMode)}</p>
            )}
            <p className="vmb-salon-qa-answer__headline">{qaAnswer.headline}</p>
            <p className="vmb-salon-qa-answer__text">{qaAnswer.answerText}</p>
            {qaAnswer.suggestedQuestions?.length ? (
              <div className="vmb-salon-qa-answer__suggestions">
                {qaAnswer.suggestedQuestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="vmb-salon-qa-chip"
                    disabled={searching}
                    onClick={() => handleChipClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {qaAnswer.intelligence?.metrics?.length ? (
              <dl className="vmb-salon-qa-answer__metrics">
                {qaAnswer.intelligence.metrics.map((metric) => (
                  <div key={metric.label} className="vmb-salon-qa-answer__metric">
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {qaAnswer.clientDossier ? (
              <dl className="vmb-salon-qa-answer__dossier">
                <div>
                  <dt>Visits</dt>
                  <dd>{qaAnswer.clientDossier.visits}</dd>
                </div>
                {qaAnswer.clientDossier.lastVisit ? (
                  <div>
                    <dt>Last visit</dt>
                    <dd>{qaAnswer.clientDossier.lastVisit}</dd>
                  </div>
                ) : null}
                {qaAnswer.clientDossier.services.length > 0 ? (
                  <div>
                    <dt>Services</dt>
                    <dd>{qaAnswer.clientDossier.services.join(", ")}</dd>
                  </div>
                ) : null}
                {qaAnswer.clientDossier.revenue > 0 ? (
                  <div>
                    <dt>Revenue</dt>
                    <dd>${Math.round(qaAnswer.clientDossier.revenue).toLocaleString("en-US")}</dd>
                  </div>
                ) : null}
                {qaAnswer.clientDossier.opportunitySignals.length > 0 ? (
                  <div className="vmb-salon-qa-answer__dossier-signals">
                    <dt>Signals</dt>
                    <dd>{qaAnswer.clientDossier.opportunitySignals.join(" · ")}</dd>
                  </div>
                ) : null}
                <div className="vmb-salon-qa-answer__dossier-move">
                  <dt>Next move</dt>
                  <dd>{qaAnswer.clientDossier.suggestedNextMove}</dd>
                </div>
              </dl>
            ) : null}
            {(qaAnswer.intelligence?.rows?.length ?? qaAnswer.results.length) > 0 ? (
              <ol className="vmb-salon-qa-answer__results">
                {(qaAnswer.intelligence?.rows ?? qaAnswer.results.map((r) => ({ name: r.clientName, detail: r.reason }))).map(
                  (result, index) => (
                    <li key={`${result.name}-${index}`}>
                      <strong>{result.name}</strong>
                      {result.detail ? <span> — {result.detail}</span> : null}
                    </li>
                  ),
                )}
              </ol>
            ) : null}
            {canPreviewOpportunityCard ? (
              <button
                type="button"
                className="vmb-salon-qa-answer__action vmb-salon-qa-answer__action--live"
                onClick={() => onPreviewFirstCard?.()}
              >
                Preview Card
              </button>
            ) : resolvedAction ? (
              <button
                type="button"
                className="vmb-salon-qa-answer__action vmb-salon-qa-answer__action--live"
                disabled={searching}
                onClick={() => handleSuggestedAction(resolvedAction)}
              >
                {resolvedAction.label}
              </button>
            ) : null}
            <p className="vmb-salon-qa-answer__followup">
              {qaAnswer.intelligence?.followUpPrompt ?? qaAnswer.followUpPrompt}
            </p>
          </div>
        ) : null}

        {legacyResults && legacyResults.matches.length > 0 && !canPreviewOpportunityCard ? (
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
      </form>
    </section>
  );
}
