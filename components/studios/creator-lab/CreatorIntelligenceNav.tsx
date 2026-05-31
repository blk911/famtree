"use client";
// components/studios/creator-lab/CreatorIntelligenceNav.tsx
// Shared subnav for all Creator Intelligence / Salon vertical admin tools.
// Renders the top IntelligenceMarketNav (vertical selector) above the tool rail.

import Link from "next/link";
import { useState } from "react";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";

export type CreatorIntelligenceTool =
  | "assembler"
  | "ig-resolver"
  | "hashtag-harvest"
  | "styleseat"
  | "education-seeds"
  | "education-directory"
  | "prospects"
  | "runs";

const TOOLS: { id: CreatorIntelligenceTool; label: string; href: string }[] = [
  { id: "assembler",       label: "Studio Assembler",   href: "/admin/studios/creator-lab" },
  { id: "ig-resolver",     label: "IG Resolver",        href: "/admin/studios/creator-lab/ig-stubs" },
  { id: "hashtag-harvest", label: "Hashtag Harvest",    href: "/admin/studios/creator-lab/hashtag-harvest" },
  { id: "styleseat",        label: "StyleSeat Discovery",  href: "/admin/studios/styleseat" },
  { id: "education-seeds",      label: "Education Seeds",     href: "/admin/studios/education-seeds" },
  { id: "education-directory",  label: "Edu Directory",       href: "/admin/studios/education-directory" },
  { id: "prospects",            label: "Prospects",           href: "/admin/studios/prospects" },
  { id: "runs",            label: "Runs",               href: "/admin/studios/runs" },
];

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

/** Notifies the Prospects page (and any salon prospect view) to re-fetch. */
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
        // Repair the data flow: force the prospects view to re-fetch the now-empty store.
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
        title="Wipe all prospect records for a clean test run"
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

  // "wiped"
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

      {/* Top-level vertical selector — Salon | Transpo | HCare | Labs */}
      <IntelligenceMarketNav />

      {/* Salon / Client-Centric tool breadcrumb */}
      <div style={{
        fontSize: 11,
        color: "#a8a29e",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 5,
        letterSpacing: "0.01em",
      }}>
        <Link href="/admin/studios" style={{ color: "#78716c", textDecoration: "none", fontWeight: 600 }}>
          AIH Studios
        </Link>
        <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
        <span style={{ color: "#44403c", fontWeight: 700 }}>Salon / Client-Centric Intelligence</span>
      </div>

      {/* Tool pill rail + Fresh Slate button */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{
          display: "inline-flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f5f4f2",
          border: "1px solid #e7e5e4",
          borderRadius: 10,
          padding: "3px 4px",
        }}>
          {TOOLS.map(({ id, label, href }) => {
            const active = id === current;
            return (
              <Link
                key={id}
                href={href}
                style={{
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#1c1917" : "#78716c",
                  background: active ? "#ffffff" : "transparent",
                  border: active ? "1px solid #e2e0dc" : "1px solid transparent",
                  borderRadius: 7,
                  padding: "4px 11px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                  lineHeight: "1.5",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Admin testing utility — wipes the prospect store for a clean run */}
        <FreshSlateButton />
      </div>

    </div>
  );
}
