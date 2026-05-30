"use client";
// components/admin/intelligence/transpo/KeywordPackSelector.tsx
// Right-panel keyword pack selector for the Transpo Source Ingest page.
// Toggling a pack merges/removes its keywords from the selected set; manual
// keywords can be added and individual chips removed. Dedupe is case-insensitive.

import { useState } from "react";
import {
  SOURCE_INGEST_KEYWORD_PACKS,
  type KeywordPack,
} from "@/lib/intelligence/transpo/keyword-packs";

export type { KeywordPack };

export type KeywordPackSelectorProps = {
  title?: string;
  description?: string;
  selectedKeywords: string[];
  onChange: (keywords: string[]) => void;
  packs?: KeywordPack[];
};

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const kw = raw.trim();
    if (!kw) continue;
    const key = kw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
  }
  return out;
}

export function KeywordPackSelector({
  title = "Keyword Packs",
  description = "Toggle packs to add curated keywords to your FMCSA test pull. You can also add your own.",
  selectedKeywords,
  onChange,
  packs = SOURCE_INGEST_KEYWORD_PACKS,
}: KeywordPackSelectorProps) {
  const [manualInput, setManualInput] = useState("");

  const selectedLower = new Set(selectedKeywords.map((k) => k.toLowerCase()));

  function isPackChecked(pack: KeywordPack): boolean {
    return pack.keywords.length > 0
      && pack.keywords.every((k) => selectedLower.has(k.toLowerCase()));
  }

  function togglePack(pack: KeywordPack, checked: boolean) {
    if (checked) {
      onChange(dedupeKeywords([...selectedKeywords, ...pack.keywords]));
      return;
    }
    // Remove this pack's keywords, but keep any owned by another still-checked pack.
    const packLower = new Set(pack.keywords.map((k) => k.toLowerCase()));
    const protectedLower = new Set<string>();
    for (const other of packs) {
      if (other.id === pack.id) continue;
      if (isPackChecked(other)) {
        for (const k of other.keywords) protectedLower.add(k.toLowerCase());
      }
    }
    onChange(
      selectedKeywords.filter((k) => {
        const lk = k.toLowerCase();
        return !packLower.has(lk) || protectedLower.has(lk);
      }),
    );
  }

  function addManual() {
    const kw = manualInput.trim();
    if (!kw) return;
    onChange(dedupeKeywords([...selectedKeywords, kw]));
    setManualInput("");
  }

  function removeChip(keyword: string) {
    onChange(selectedKeywords.filter((k) => k !== keyword));
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#57534e",
    marginBottom: 5,
    letterSpacing: "0.03em",
  };

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e7e5e4",
      borderRadius: 14,
      padding: "20px 22px",
    }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          {title}
        </h2>
        <p style={{ fontSize: 11, color: "#78716c", margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      {/* Pack checkboxes */}
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {packs.map((pack) => {
          const checked = isPackChecked(pack);
          return (
            <label
              key={pack.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                fontSize: 12,
                color: "#1c1917",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => togglePack(pack, e.target.checked)}
                style={{ marginTop: 2, cursor: "pointer" }}
              />
              <span>
                <span style={{ fontWeight: 700 }}>{pack.label}</span>
                <span style={{ color: "#a8a29e", marginLeft: 6, fontSize: 11 }}>
                  {pack.keywords.join(", ")}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Manual add */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="transpo-add-keyword">Add keyword</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            id="transpo-add-keyword"
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="e.g. expedited"
            style={{
              fontSize: 12,
              padding: "8px 10px",
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              background: "#fff",
              color: "#1c1917",
              flex: 1,
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={addManual}
            disabled={!manualInput.trim()}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #e7e5e4",
              background: manualInput.trim() ? "#1c1917" : "#f5f5f4",
              color: manualInput.trim() ? "#fff" : "#a8a29e",
              cursor: manualInput.trim() ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected chips */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={labelStyle}>
            Selected keywords ({selectedKeywords.length})
          </span>
          {selectedKeywords.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#dc2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>
        {selectedKeywords.length === 0 ? (
          <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>
            No keywords selected yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedKeywords.map((kw) => (
              <span
                key={kw}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 8px 4px 10px",
                  borderRadius: 16,
                  background: "#f5f5f4",
                  border: "1px solid #e7e5e4",
                  color: "#1c1917",
                }}
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeChip(kw)}
                  aria-label={`Remove ${kw}`}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#78716c",
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KeywordPackSelector;
