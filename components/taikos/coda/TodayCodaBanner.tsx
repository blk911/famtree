"use client";

import { useState } from "react";
import type { CodaSearchResult, CodaSummary } from "@/lib/taikos/coda/types";
import { phaseLabel } from "@/lib/taikos/coda/context-engine";

type Props = {
  greeting: string;
  coda: CodaSummary;
};

export function TodayCodaBanner({ greeting, coda }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CodaSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerFirst = coda?.context?.ownerName?.split(/\s+/)[0] || coda?.context?.ownerName || "there";
  const count = Math.max(coda?.insightCount ?? 0, coda?.opportunityCount ?? 0);

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
      <div className="vmb-today-coda-banner__greeting">
        <p className="vmb-today-coda-banner__hello">✨ Hi {ownerFirst}</p>
        <p className="vmb-today-coda-banner__summary">
          We found {count} {count === 1 ? "opportunity" : "opportunities"} today.
        </p>
        <p className="vmb-today-coda-banner__phase">
          {phaseLabel(coda?.context?.currentPhase ?? "onboarding")} ·{" "}
          <strong>{coda?.objective?.label ?? "Make Today's Relationship Moves"}</strong>
        </p>
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

      <p className="vmb-today__greeting vmb-today__greeting--sub">{greeting}</p>
    </section>
  );
}
