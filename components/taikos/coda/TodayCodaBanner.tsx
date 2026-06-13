"use client";

import { useMemo, useState } from "react";
import type { CodaSearchResult, CodaSummary } from "@/lib/taikos/coda/types";
import {
  buildTodayConversationLines,
  buildTodayGreeting,
  relationshipOpportunityCount,
} from "@/lib/taikos/context/today-conversation";

type Props = {
  coda: CodaSummary;
  operatorName?: string;
  salonName?: string;
};

export function TodayCodaBanner({ coda, operatorName, salonName }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CodaSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headline = useMemo(
    () => buildTodayGreeting(operatorName ?? coda.context?.ownerName, salonName),
    [operatorName, salonName, coda.context?.ownerName],
  );
  const count = relationshipOpportunityCount(coda);
  const focusLabel = coda?.objective?.label ?? "Make today's relationship moves";
  const conversationLines = useMemo(() => buildTodayConversationLines(coda), [coda]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/taikos/coda/search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = (await res.json()) as { ok: boolean; data?: CodaSearchResult; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Search failed");
        setResults(null);
        return;
      }
      setResults(json.data);
    } catch {
      setError("Search failed");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

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

        {results && results.matches.length > 0 ? (
          <div className="vmb-today-coda-banner__results">
            <p className="vmb-today-coda-banner__results-label">From your book</p>
            <ul className="vmb-today-coda-banner__results-list">
              {results.matches.map((match) => (
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

        {results && results.matches.length === 0 ? (
          <p className="vmb-today-coda-banner__no-results">No matches in your book for that question.</p>
        ) : null}
      </div>

      <form className="vmb-today-coda-banner__search" onSubmit={(e) => void runSearch(e)}>
        <label className="vmb-today-coda-banner__search-label" htmlFor="today-coda-search">
          What else are you thinking about?
        </label>
        <div className="vmb-today-coda-banner__search-row">
          <input
            id="today-coda-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Who was the girl with dip nails? Which brides never came back?"
            className="vmb-today-coda-banner__input"
          />
          <button type="submit" className="taikos-opp-card__cta" disabled={searching || !query.trim()}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>
    </section>
  );
}
