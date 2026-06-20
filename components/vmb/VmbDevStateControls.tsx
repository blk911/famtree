"use client";

import { useCallback, useEffect, useState } from "react";
import { readLatestAnalysisId, readStoredTrialId, writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";

type DevStateSnapshot = {
  timestamp: string;
  salonId?: string;
  latestAnalysisId?: string;
  lastRoute: string;
  counts: {
    clients: number;
    services: number;
    invitations: number;
    cards: number;
    opportunities: number;
  };
};

type DevStateStatus = {
  exists: boolean;
  snapshot: DevStateSnapshot | null;
};

const buttonStyle = {
  padding: "7px 10px",
  borderRadius: 9,
  border: `1px solid ${VMB_THEME.line}`,
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: VMB_THEME.ink,
  cursor: "pointer",
} as const;

export function VmbDevStateControls() {
  const [status, setStatus] = useState<DevStateStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (process.env.NODE_ENV === "production") return;
    try {
      const res = await fetch("/api/vmb/dev-state/status", { cache: "no-store", credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as { ok: boolean; data?: DevStateStatus };
      if (json.ok && json.data) setStatus(json.data);
    } catch {
      // dev convenience only
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const capture = useCallback(async () => {
    setBusy("capture");
    setMessage(null);
    try {
      const res = await fetch("/api/vmb/dev-state/capture", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latestAnalysisId: readLatestAnalysisId(),
          sessionId: readStoredTrialId(),
          lastRoute: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: DevStateSnapshot };
      if (!json.ok) {
        setMessage(json.error ?? "Capture failed.");
        return;
      }
      setMessage("Captured current VMB dev state.");
      await loadStatus();
    } catch {
      setMessage("Capture failed.");
    } finally {
      setBusy(null);
    }
  }, [loadStatus]);

  const restore = useCallback(async () => {
    setBusy("restore");
    setMessage(null);
    try {
      const res = await fetch("/api/vmb/dev-state/restore", { method: "POST", credentials: "include" });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { salonId: string; analysisId: string; redirectUrl: string };
      };
      if (!json.ok || !json.data) {
        setMessage(json.error ?? "Restore failed.");
        return;
      }
      writeActiveBookSession({ analysisId: json.data.analysisId, trialId: json.data.salonId });
      window.location.href = json.data.redirectUrl || "/vmb/start";
    } catch {
      setMessage("Restore failed.");
      setBusy(null);
    }
  }, []);

  const clear = useCallback(async () => {
    setBusy("clear");
    setMessage(null);
    try {
      const res = await fetch("/api/vmb/dev-state/clear", { method: "POST", credentials: "include" });
      if (!res.ok) {
        setMessage("Clear failed.");
        return;
      }
      setMessage("Cleared VMB dev state.");
      await loadStatus();
    } catch {
      setMessage("Clear failed.");
    } finally {
      setBusy(null);
    }
  }, [loadStatus]);

  if (process.env.NODE_ENV === "production") return null;

  const snapshot = status?.snapshot;
  return (
    <div
      style={{
        margin: "12px 0 18px",
        padding: 12,
        borderRadius: 12,
        border: `1px dashed ${VMB_THEME.line}`,
        background: "#fffbeb",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong style={{ fontSize: 12, color: VMB_THEME.ink }}>VMB dev state</strong>
        <button type="button" style={buttonStyle} disabled={busy === "restore"} onClick={() => void restore()}>
          {busy === "restore" ? "Restoring…" : "Restore Last Working State"}
        </button>
        <button type="button" style={buttonStyle} disabled={busy === "capture"} onClick={() => void capture()}>
          {busy === "capture" ? "Capturing…" : "Capture Current State"}
        </button>
        <button type="button" style={buttonStyle} disabled={busy === "clear"} onClick={() => void clear()}>
          {busy === "clear" ? "Clearing…" : "Clear Dev State"}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: VMB_THEME.muted }}>
        {snapshot
          ? `Last: ${snapshot.lastRoute} · ${snapshot.counts.clients} clients · ${snapshot.counts.services} services · ${snapshot.counts.invitations} invites`
          : "No captured state yet."}
      </p>
      {message ? <p style={{ margin: 0, fontSize: 12, color: VMB_THEME.accent }}>{message}</p> : null}
    </div>
  );
}
