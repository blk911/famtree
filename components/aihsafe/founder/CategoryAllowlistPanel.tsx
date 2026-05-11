"use client";

import { useEffect, useState } from "react";
import {
  INTEREST_CATEGORIES,
  ALL_CATEGORY_IDS,
  type InterestCategory,
} from "@/lib/aihsafe/interests/categories";

// ─── localStorage key ─────────────────────────────────────────────────────────
// Stores the founder's enabled category ID set as a JSON string array.
// All IDs present = category enabled. Missing = category disabled.
// On first load (key absent) → all categories enabled by default.

const STORAGE_KEY = "aihsafe_founder_allowed_categories";

function readFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set(ALL_CATEGORY_IDS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(ALL_CATEGORY_IDS); // default: all enabled
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : ALL_CATEGORY_IDS);
  } catch {
    return new Set(ALL_CATEGORY_IDS);
  }
}

function writeToStorage(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

// ─── Category toggle row ──────────────────────────────────────────────────────

function CategoryToggle({
  category,
  enabled,
  onToggle,
}: {
  category: InterestCategory;
  enabled:  boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      title={category.description}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            6,
        padding:        "6px 12px",
        borderRadius:   20,
        border:         `1px solid ${enabled ? "#6366f1" : "#e7e5e4"}`,
        background:     enabled ? "#eef2ff" : "#fafaf9",
        color:          enabled ? "#4338ca" : "#a8a29e",
        fontSize:       12,
        fontWeight:     enabled ? 700 : 500,
        cursor:         "pointer",
        transition:     "all 0.12s",
        userSelect:     "none",
      }}
    >
      <span style={{ fontSize: 15 }}>{category.emoji}</span>
      {category.label}
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function CategoryAllowlistPanel() {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set(ALL_CATEGORY_IDS));
  const [hydrated,   setHydrated]   = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setEnabledIds(readFromStorage());
    setHydrated(true);
  }, []);

  function toggle(id: string) {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeToStorage(next);
      return next;
    });
  }

  function enableAll() {
    const all = new Set(ALL_CATEGORY_IDS as string[]);
    writeToStorage(all);
    setEnabledIds(all);
  }

  const enabledCount  = enabledIds.size;
  const totalCount    = INTEREST_CATEGORIES.length;
  const allEnabled    = enabledCount === totalCount;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Section label */}
      <p style={{
        fontSize:      11,
        fontWeight:    700,
        color:         "#a8a29e",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin:        "16px 0 8px",
      }}>
        Content categories
      </p>

      {/* Persistence notice */}
      <div
        style={{
          display:      "flex",
          alignItems:   "flex-start",
          gap:          8,
          background:   "#fffbeb",
          border:       "1px solid #fde68a",
          borderRadius: 10,
          padding:      "9px 13px",
          marginBottom: 12,
          fontSize:     12,
          color:        "#92400e",
          lineHeight:   1.45,
        }}
      >
        <span style={{ flexShrink: 0, fontSize: 14 }}>⚡</span>
        <span>
          Category preferences are saved in your browser.
          Network-wide persistence across all members is coming in a future update.
        </span>
      </div>

      {/* Status line */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#78716c" }}>
          {hydrated ? `${enabledCount} of ${totalCount} categories enabled for children` : "Loading…"}
        </span>
        {!allEnabled && (
          <button
            type="button"
            onClick={enableAll}
            style={{
              background:  "none",
              border:      "none",
              color:       "#6366f1",
              fontSize:    12,
              fontWeight:  600,
              cursor:      "pointer",
              padding:     0,
            }}
          >
            Enable all
          </button>
        )}
      </div>

      {/* Category chip grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {INTEREST_CATEGORIES.map((cat) => (
          <CategoryToggle
            key={cat.id}
            category={cat}
            enabled={!hydrated || enabledIds.has(cat.id)}
            onToggle={() => toggle(cat.id)}
          />
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#d6d3d1", margin: "12px 0 0" }}>
        Disabled categories are hidden from children&apos;s topic picker. They can still post without a topic.
      </p>
    </div>
  );
}
