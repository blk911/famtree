"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  county: string;
  state: string;
  serviceCategory: string;
  countyOpportunityId?: string;
  source?: "county_opportunity" | "service_deficit";
  compact?: boolean;
  onPromoted?: (actionId: string) => void;
};

export function PromoteToActionQueueButton({
  county,
  state,
  serviceCategory,
  countyOpportunityId,
  source = "county_opportunity",
  compact,
  onPromoted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function handlePromote(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/action-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county,
          state,
          serviceCategory,
          service: serviceCategory,
          countyOpportunityId,
          source,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error ?? "Promote failed");
        return;
      }
      const id = data.record?.id as string | undefined;
      if (id) {
        setActionId(id);
        onPromoted?.(id);
      }
      setMessage(data.duplicate ? "Already in queue" : "Added to Action Queue");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: compact ? "flex-start" : "stretch" }}>
      <button
        type="button"
        onClick={handlePromote}
        disabled={loading}
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          padding: compact ? "4px 10px" : "7px 14px",
          borderRadius: 8,
          border: "1px solid #c7d2fe",
          background: loading ? "#e7e5e4" : "#eef2ff",
          color: "#4338ca",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Promoting…" : "Promote To Action Queue"}
      </button>
      {message ? (
        <span style={{ fontSize: 10, color: message.includes("Already") ? "#92400e" : "#166534" }}>
          {message}
          {actionId ? (
            <>
              {" "}
              <Link href={`/admin/intelligence/transpo/action-queue?action=${actionId}`} style={{ color: "#4338ca" }}>
                Open →
              </Link>
            </>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
