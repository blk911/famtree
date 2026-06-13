"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiosCard } from "@/components/taikos/AiosCard";
import { AiosQuestionInput } from "@/components/taikos/AiosQuestionInput";
import { buildTodayConversationLines } from "@/lib/taikos/context/today-conversation";
import type { CodaSearchResult } from "@/lib/taikos/coda/types";
import type { AiosContextPacket, AiosResponse } from "@/lib/taikos/types";

export type InlineAiosPanelState = "open_intro" | "open_input" | "open_results";

type Props = {
  context?: AiosContextPacket | null;
  operatorName?: string;
  salonName?: string;
  analysisId?: string;
  onClose: () => void;
  /** Auto-close after N ms — only for auto-opened guidance, not manual ✨ opens. */
  autoCloseMs?: number;
};

export function InlineAiosPanel({
  context,
  operatorName = "Owner",
  salonName = "Your Salon",
  analysisId,
  onClose,
  autoCloseMs,
}: Props) {
  const [panelState, setPanelState] = useState<InlineAiosPanelState>("open_intro");
  const [response, setResponse] = useState<AiosResponse | null>(null);
  const [searchResult, setSearchResult] = useState<CodaSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closedRef = useRef(false);

  const conversationLines = useMemo(() => {
    if (!context?.codaSummary) return [];
    return buildTodayConversationLines(context.codaSummary);
  }, [context?.codaSummary]);

  const opportunityCount = useMemo(() => {
    const coda = context?.codaSummary;
    if (!coda) return 0;
    return Math.max(coda.opportunityCount ?? 0, coda.insightCount ?? 0, coda.insights?.length ?? 0);
  }, [context?.codaSummary]);

  useEffect(() => {
    if (!autoCloseMs) return;
    const timer = setTimeout(() => {
      if (!closedRef.current) onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [autoCloseMs, onClose]);

  const askBriefing = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      setSearchResult(null);
      setPanelState("open_results");
      try {
        const params = new URLSearchParams({
          pathname: "/vmb/today",
          mode: "question",
          question: q,
        });
        if (analysisId) params.set("analysisId", analysisId);
        const res = await fetch(`/api/taikos/briefing?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: { response: AiosResponse };
          error?: string;
        };
        if (res.ok && json.ok && json.data?.response) {
          setResponse(json.data.response);
        } else {
          setError(json.error ?? "Could not answer that question.");
        }
      } catch {
        setError("Could not answer that question.");
      } finally {
        setLoading(false);
      }
    },
    [analysisId],
  );

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setPanelState("open_results");
    try {
      const res = await fetch("/api/taikos/coda/search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: CodaSearchResult;
        error?: string;
      };
      if (res.ok && json.ok && json.data) {
        setSearchResult(json.data);
      } else {
        setError(json.error ?? "Search failed.");
      }
    } catch {
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQuestion = useCallback(
    (question: string) => {
      const lower = question.toLowerCase();
      if (
        lower.includes("client") ||
        lower.includes("contact") ||
        lower.includes("referral") ||
        lower.includes("overdue") ||
        lower.includes("saturday") ||
        lower.includes("opportunit")
      ) {
        void runSearch(question);
        return;
      }
      void askBriefing(question);
    },
    [askBriefing, runSearch],
  );

  function handleClose() {
    closedRef.current = true;
    onClose();
  }

  function showResultsFromProps() {
    setPanelState("open_results");
    setError(null);
    setResponse(null);
    setSearchResult(null);
  }

  return (
    <section className="inline-aios-panel" aria-label="tAIkOS">
      {panelState === "open_intro" ? (
        <div className="inline-aios-panel__body">
          {opportunityCount > 0 ? (
            <p className="inline-aios-panel__message">
              I found {opportunityCount} relationship{" "}
              {opportunityCount === 1 ? "opportunity" : "opportunities"} worth a look below.
            </p>
          ) : (
            <p className="inline-aios-panel__message">
              I&apos;m ready when you are — ask about {salonName}&apos;s book or open an opportunity
              card below.
            </p>
          )}
          {conversationLines.length > 0 ? (
            <div className="inline-aios-panel__conversation">
              {conversationLines.map((line) => (
                <p key={line} className="inline-aios-panel__soft">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {!context ? (
            <p className="inline-aios-panel__soft">Guidance will sharpen once Today finishes loading your book summary.</p>
          ) : null}
          <div className="inline-aios-panel__actions">
            <button type="button" className="inline-aios-panel__btn" onClick={showResultsFromProps}>
              Show me
            </button>
            <button
              type="button"
              className="inline-aios-panel__btn inline-aios-panel__btn--secondary"
              onClick={() => setPanelState("open_input")}
            >
              Ask tAIkOS
            </button>
            <button type="button" className="inline-aios-panel__btn inline-aios-panel__btn--ghost" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {panelState === "open_input" ? (
        <div className="inline-aios-panel__body">
          <p className="inline-aios-panel__intel-label">What are you thinking about?</p>
          <p className="inline-aios-panel__message">Ask about a client, opportunity, or next move.</p>
          <AiosQuestionInput onSubmit={handleQuestion} disabled={loading} />
          <div className="inline-aios-panel__actions inline-aios-panel__actions--after-input">
            <button type="button" className="inline-aios-panel__btn inline-aios-panel__btn--ghost" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {panelState === "open_results" ? (
        <div className="inline-aios-panel__body">
          {loading ? <p className="inline-aios-panel__loading">Thinking…</p> : null}
          {error ? <p className="inline-aios-panel__error">{error}</p> : null}

          {!loading && !error && !response && !searchResult ? (
            <>
              {conversationLines.length > 0 ? (
                <div className="inline-aios-panel__conversation">
                  {conversationLines.map((line) => (
                    <p key={line} className="inline-aios-panel__message">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="inline-aios-panel__soft">
                  No ranked opportunities yet — check back after your book refresh.
                </p>
              )}
              <p className="inline-aios-panel__soft">
                Open an opportunity below to preview its suggested card before you approve.
              </p>
            </>
          ) : null}

          {searchResult ? (
            <div className="inline-aios-panel__search">
              <p>
                {searchResult.matches.length > 0
                  ? `Found ${searchResult.matches.length} match${searchResult.matches.length === 1 ? "" : "es"} for “${searchResult.query}”.`
                  : `No client matches for “${searchResult.query}”.`}
              </p>
              {searchResult.matches.length > 0 ? (
                <ul>
                  {searchResult.matches.slice(0, 5).map((hit) => (
                    <li key={`${hit.clientName}-${hit.subjectLabel}`}>
                      <strong>{hit.clientName}</strong> — {hit.matchReason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {response ? (
            <div className="inline-aios-panel__answer">
              {response.message ? <p>{response.message}</p> : null}
              {response.cards.length > 0 ? (
                <div className="inline-aios-panel__cards">
                  {response.cards.map((card) => (
                    <AiosCard key={card.id} card={card} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="inline-aios-panel__ask-last">
            <p className="inline-aios-panel__intel-label">What are you thinking about?</p>
            <AiosQuestionInput onSubmit={handleQuestion} disabled={loading} />
          </div>

          <div className="inline-aios-panel__actions">
            <button type="button" className="inline-aios-panel__btn inline-aios-panel__btn--ghost" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
