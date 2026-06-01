"use client";
// components/studios/creator-lab/CreatorIntelligenceNav.tsx
// Salon vertical subnav — tools from salon.config only (no in-page vertical selector).

import { useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";

export type CreatorIntelligenceTool =
  | "assembler"
  | "ig-resolver"
  | "hashtag-harvest"
  | "prospects"
  | "runs"
  | "import-candidates"
  | "harvest-analytics";

const TOOL_TO_NAV_ID: Record<CreatorIntelligenceTool, string> = {
  assembler: "assembler",
  "ig-resolver": "resolver",
  "hashtag-harvest": "harvest",
  prospects: "prospects",
  runs: "runs",
  "import-candidates": "import_candidates",
  "harvest-analytics": "harvest_analytics",
};

type WipeState = "idle" | "counting" | "confirming" | "wiping" | "wiped" | "error";

type ClearedArtifact = { path: string; existed: boolean; action: string };
type ClearAllResponse = {
  ok: boolean;
  phase?: "count" | "cleared";
  count?: number;
  cleared?: ClearedArtifact[];
  remainingCounts?: { prospects: number; matching: number; shown: number };
  error?: string;
  detail?: string;
};

function broadcastProspectsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("salon-prospects:refresh"));
  }
}

function FreshSlateButton() {
  const [wipeState, setWipeState] = useState<WipeState>("idle");
  const [recordCount, setRecordCount] = useState<number>(0);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleFirstClick() {
    setWipeState("counting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/studios/prospects/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: false, vertical: "salon" }),
      });
      const data = (await res.json()) as ClearAllResponse;
      if (data.ok) {
        setRecordCount(data.count ?? 0);
        setWipeState("confirming");
      } else {
        setErrorMessage(data.error ?? data.detail ?? "Could not read prospect count.");
        setWipeState("error");
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setWipeState("error");
    }
  }

  async function handleConfirm() {
    setWipeState("wiping");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/studios/prospects/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, vertical: "salon" }),
      });
      const data = (await res.json()) as ClearAllResponse;
      if (data.ok) {
        const fileCount = data.cleared?.length ?? 0;
        const remaining = data.remainingCounts?.prospects ?? 0;
        setResultMessage(
          `Fresh state cleared ${fileCount} file${fileCount === 1 ? "" : "s"}. ${remaining} prospect${remaining === 1 ? "" : "s"} remain.`,
        );
        setWipeState("wiped");
        broadcastProspectsRefresh();
        setTimeout(() => setWipeState("idle"), 5000);
      } else {
        setErrorMessage(data.error ?? data.detail ?? "Clear failed.");
        setWipeState("error");
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setWipeState("error");
    }
  }

  function handleCancel() {
    setWipeState("idle");
    setRecordCount(0);
    setErrorMessage("");
  }

  if (wipeState === "idle") {
    return (
      <button
        type="button"
        onClick={handleFirstClick}
        title="Wipe all salon prospect records for a clean test run"
        style={{
          fontSize: 11, fontWeight: 700,
          color: "#9d174d", background: "transparent",
          border: "1px solid #fecdd3",
          borderRadius: 7, padding: "4px 10px",
          cursor: "pointer", whiteSpace: "nowrap",
          lineHeight: "1.5",
        }}
      >
        ⟳ Fresh Slate
      </button>
    );
  }

  if (wipeState === "counting") {
    return (
      <span style={{ fontSize: 11, color: "#a8a29e", padding: "4px 10px" }}>
        Counting…
      </span>
    );
  }

  if (wipeState === "confirming") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#fef2f2", border: "1px solid #fecaca",
        borderRadius: 8, padding: "4px 10px",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c" }}>
          ⚠️ Delete {recordCount} record{recordCount !== 1 ? "s" : ""}?
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            fontSize: 11, fontWeight: 800, color: "#fff",
            background: "#dc2626", border: "none",
            borderRadius: 5, padding: "2px 9px",
            cursor: "pointer",
          }}
        >
          Yes, wipe all
        </button>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            fontSize: 11, fontWeight: 700, color: "#78716c",
            background: "transparent", border: "1px solid #e7e5e4",
            borderRadius: 5, padding: "2px 8px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  if (wipeState === "wiping") {
    return (
      <span style={{ fontSize: 11, color: "#b91c1c", fontWeight: 700, padding: "4px 10px" }}>
        Wiping…
      </span>
    );
  }

  if (wipeState === "error") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        fontSize: 11, fontWeight: 700, color: "#b91c1c",
        background: "#fef2f2", border: "1px solid #fecaca",
        borderRadius: 7, padding: "4px 10px", maxWidth: 360,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ✗ Fresh Slate failed — {errorMessage}
        </span>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            fontSize: 11, fontWeight: 700, color: "#78716c",
            background: "transparent", border: "1px solid #e7e5e4",
            borderRadius: 5, padding: "2px 8px", cursor: "pointer", flexShrink: 0,
          }}
        >
          Dismiss
        </button>
      </span>
    );
  }

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#15803d",
      background: "#f0fdf4", border: "1px solid #bbf7d0",
      borderRadius: 7, padding: "4px 10px",
    }}>
      ✓ {resultMessage || `Wiped — ${recordCount} record${recordCount !== 1 ? "s" : ""} removed`}
    </span>
  );
}

export function CreatorIntelligenceNav({ current }: { current: CreatorIntelligenceTool }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav
        config={salonConfig}
        currentTool={TOOL_TO_NAV_ID[current]}
        trailing={<FreshSlateButton />}
        showContextBadge={false}
      />
    </div>
  );
}
