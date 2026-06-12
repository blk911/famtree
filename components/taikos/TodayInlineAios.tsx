"use client";

import { useCallback, useMemo, useState } from "react";
import { AiosCard } from "@/components/taikos/AiosCard";
import { AiosQuestionInput } from "@/components/taikos/AiosQuestionInput";
import { AiosSuggestionChips } from "@/components/taikos/AiosSuggestionChips";
import { buildInlineAssistantView } from "@/lib/taikos/context/inline-assistant";
import type { CodaSearchResult } from "@/lib/taikos/coda/types";
import type { AiosContextPacket, AiosResponse } from "@/lib/taikos/types";

type Props = {
  context: AiosContextPacket;
  analysisId?: string;
};

export function TodayInlineAios({ context, analysisId }: Props) {
  const assistant = useMemo(() => buildInlineAssistantView(context), [context]);
  const [response, setResponse] = useState<AiosResponse | null>(null);
  const [searchResult, setSearchResult] = useState<CodaSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askBriefing = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      setSearchResult(null);
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
        lower.includes("saturday")
      ) {
        void runSearch(question);
        return;
      }
      void askBriefing(question);
    },
    [askBriefing, runSearch],
  );

  return (
    <section className="today-inline-aios" aria-label="tAIkOS guidance">
      <header className="today-inline-aios__header">
        <p className="today-inline-aios__eyebrow">tAIkOS</p>
        <p className="today-inline-aios__mode">Inline assistant</p>
      </header>

      <div className="today-inline-aios__body">
        <p className="today-inline-aios__intro">{assistant.intro}</p>
        {assistant.objective ? (
          <p className="today-inline-aios__objective">
            <strong>Objective:</strong> {assistant.objective}
          </p>
        ) : null}

        {assistant.recommendations.length > 0 ? (
          <ul className="today-inline-aios__recs">
            {assistant.recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        ) : null}

        {assistant.potentialValue > 0 ? (
          <p className="today-inline-aios__value">
            Estimated opportunity value:{" "}
            <strong>+${assistant.potentialValue.toLocaleString()}</strong>
          </p>
        ) : null}

        {loading ? <p className="today-inline-aios__loading">Thinking…</p> : null}
        {error ? <p className="today-inline-aios__error">{error}</p> : null}

        {searchResult ? (
          <div className="today-inline-aios__search">
            <p className="today-inline-aios__search-summary">
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
          <div className="today-inline-aios__answer">
            {response.message ? <p>{response.message}</p> : null}
            {response.cards.length > 0 ? (
              <div className="today-inline-aios__cards">
                {response.cards.map((card) => (
                  <AiosCard key={card.id} card={card} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <AiosSuggestionChips onSelect={handleQuestion} disabled={loading} />
        <AiosQuestionInput onSubmit={handleQuestion} disabled={loading} />
      </div>
    </section>
  );
}
