"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import { getFounderSettings, patchFounderSettings } from "@/components/aihsafe/common/apiClient";
import type { FounderSettingsDTO, PatchFounderSettingsRequest } from "@/types/aihsafe/dto";

// ─── Toggle row ───────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label:       string;
  description: string;
  checked:     boolean;
  onChange:    (v: boolean) => void;
  disabled:    boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  const id = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      style={{
        display:       "flex",
        alignItems:    "flex-start",
        gap:           14,
        padding:       "13px 0",
        borderBottom:  "1px solid #f5f4f0",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <label
          htmlFor={id}
          style={{
            display:    "block",
            fontWeight: 600,
            fontSize:   13,
            color:      "#1c1917",
            cursor:     disabled ? "default" : "pointer",
            marginBottom: 2,
          }}
        >
          {label}
        </label>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          {description}
        </p>
      </div>

      {/* Toggle switch */}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position:        "relative",
          display:         "inline-flex",
          alignItems:      "center",
          width:           40,
          height:          22,
          borderRadius:    999,
          border:          "none",
          background:      checked ? "#6366f1" : "#d6d3d1",
          cursor:          disabled ? "default" : "pointer",
          flexShrink:      0,
          transition:      "background 0.15s",
          padding:         0,
          marginTop:       2,
          opacity:         disabled ? 0.5 : 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position:   "absolute",
            left:       checked ? 20 : 2,
            width:      18,
            height:     18,
            borderRadius: 999,
            background: "#fff",
            boxShadow:  "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.15s",
          }}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

// ─── Scope selector ───────────────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  { value: "family",        label: "Family  (recommended)" },
  { value: "trust_unit",   label: "Trust Unit" },
  { value: "extended_trust", label: "Extended Trust" },
] as const;

interface ScopeSelectorProps {
  value:    string;
  onChange: (v: string) => void;
  disabled: boolean;
}

function ScopeSelector({ value, onChange, disabled }: ScopeSelectorProps) {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "flex-start",
        gap:          14,
        padding:      "13px 0",
        borderBottom: "1px solid #f5f4f0",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <label
          htmlFor="default-scope-select"
          style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#1c1917", marginBottom: 2 }}
        >
          Default content visibility
        </label>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          Default scope applied to adult member posts. Members can always choose a narrower scope.
        </p>
      </div>
      <select
        id="default-scope-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding:      "5px 10px",
          borderRadius: 8,
          border:       "1px solid #d6d3d1",
          background:   "#fff",
          fontSize:     12,
          fontWeight:   600,
          color:        "#1c1917",
          cursor:       disabled ? "default" : "pointer",
          flexShrink:   0,
          marginTop:    2,
          opacity:      disabled ? 0.5 : 1,
        }}
      >
        {SCOPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid #f5f4f0" }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: 13, width: "45%", background: "#e7e5e4", borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 11, width: "75%", background: "#f5f4f0", borderRadius: 4 }} />
      </div>
      <div style={{ width: 40, height: 22, borderRadius: 999, background: "#e7e5e4", flexShrink: 0 }} />
    </div>
  );
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = {
    saving: { color: "#78716c", text: "Saving…" },
    saved:  { color: "#16a34a", text: "✓ Saved" },
    error:  { color: "#dc2626", text: "Save failed" },
  } as const;
  const { color, text } = map[state];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, transition: "opacity 0.2s" }}>
      {text}
    </span>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function FounderSettingsEditor() {
  const [settings,   setSettings]   = useState<FounderSettingsDTO | null>(null);
  const [loadError,  setLoadError]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saveState,  setSaveState]  = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await getFounderSettings();
    if (result.kind === "ok") {
      setSettings(result.data);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(patch: PatchFounderSettingsRequest) {
    if (!settings) return;

    // Optimistic update
    setSettings((prev) => prev ? { ...prev, ...patch } : prev);
    setSaveState("saving");

    const result = await patchFounderSettings(patch);

    if (result.kind === "ok") {
      setSettings(result.data);
      setSaveState("saved");
    } else {
      // Rollback on failure
      setSaveState("error");
      load();
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("idle"), 2200);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Governance Settings"
        action={<SaveIndicator state={saveState} />}
      />

      {loadError && (
        <div
          role="alert"
          style={{
            background:   "#fef2f2",
            border:       "1px solid #fca5a5",
            borderRadius: 10,
            padding:      "10px 14px",
            fontSize:     13,
            color:        "#dc2626",
            display:      "flex",
            alignItems:   "center",
            gap:          10,
          }}
        >
          <span>Couldn&apos;t load settings.</span>
          <button
            type="button"
            onClick={load}
            style={{
              background:   "none",
              border:       "none",
              color:        "#dc2626",
              fontWeight:   700,
              fontSize:     12,
              cursor:       "pointer",
              padding:      0,
              textDecoration: "underline",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loadError && (
        <div>
          {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && settings && (
        <div>
          {/* ── Minor protection ─── */}
          <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 0 0" }}>
            Minor protection
          </p>

          <ToggleRow
            label="Guardian approval for minors"
            description="All governed actions by children and teens are routed to guardian approval."
            checked={settings.requireGuardianApprovalForMinors}
            onChange={(v) => save({ requireGuardianApprovalForMinors: v })}
            disabled={saveState === "saving"}
          />
          <ToggleRow
            label="Allow minor posting"
            description="When off, children and teens cannot create posts regardless of other settings."
            checked={settings.allowMinorPosting}
            onChange={(v) => save({ allowMinorPosting: v })}
            disabled={saveState === "saving"}
          />
          <ToggleRow
            label="Allow minor invites"
            description="When on, minors may send invites (still subject to guardian approval)."
            checked={settings.allowMinorInvites}
            onChange={(v) => save({ allowMinorInvites: v })}
            disabled={saveState === "saving"}
          />
          <ToggleRow
            label="Allow minor external links"
            description="When off, minors cannot include external URLs in their posts or profiles."
            checked={settings.allowMinorExternalLinks}
            onChange={(v) => save({ allowMinorExternalLinks: v })}
            disabled={saveState === "saving"}
          />

          {/* ── Network defaults ─── */}
          <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", margin: "16px 0 0" }}>
            Network defaults
          </p>

          <ScopeSelector
            value={settings.defaultVisibilityScope}
            onChange={(v) => save({ defaultVisibilityScope: v })}
            disabled={saveState === "saving"}
          />
          <ToggleRow
            label="Trusted adults"
            description="Enable the trusted-adult guardian kind, allowing non-parent adults to hold guardian roles."
            checked={settings.enableTrustedAdults}
            onChange={(v) => save({ enableTrustedAdults: v })}
            disabled={saveState === "saving"}
          />
          <ToggleRow
            label="Private thread spaces"
            description="Allow creation of private Trust Unit spaces with restricted visibility."
            checked={settings.enablePrivateThreads}
            onChange={(v) => save({ enablePrivateThreads: v })}
            disabled={saveState === "saving"}
          />
        </div>
      )}
    </div>
  );
}
