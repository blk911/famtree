"use client";

import { useCallback, useEffect, useState } from "react";
import { writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbBookAnalysisCatalogItem } from "@/types/vmb/book-analysis-catalog";

type CatalogResponse = {
  ok: boolean;
  data?: {
    backend: "postgres" | "json";
    currentSalonId?: string;
    analyses: VmbBookAnalysisCatalogItem[];
  };
  error?: string;
};

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  onRestored?: () => void;
};

export function VmbSessionDevDiagnostic({
  salonId,
  backend,
}: {
  salonId?: string;
  backend?: "postgres" | "json";
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <p
      style={{
        margin: "16px 0 0",
        fontSize: 12,
        lineHeight: 1.5,
        color: VMB_THEME.muted,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      Current salon: {salonId?.trim() || "none"}
      <br />
      Active backend: {backend ?? "…"}
    </p>
  );
}

export function RestoreExistingBookPanel({ onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse["data"] | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/book-analyses", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as CatalogResponse;
      if (!json.ok || !json.data) {
        setError(json.error ?? "Could not load analyses.");
        setCatalog(null);
        return;
      }
      setCatalog(json.data);
    } catch {
      setError("Could not load analyses.");
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    void loadCatalog();
  }, [loadCatalog]);

  async function handleRestore(analysisId: string) {
    setRestoringId(analysisId);
    setError(null);
    try {
      const res = await fetch("/api/vmb/active-book/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ analysisId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { analysisId: string; salonId: string };
        error?: string;
      };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Restore failed.");
        return;
      }
      writeActiveBookSession({
        analysisId: json.data.analysisId,
        trialId: json.data.salonId,
      });
      setOpen(false);
      if (onRestored) {
        onRestored();
      } else {
        window.location.href = `/vmb/dashboard?analysis=${encodeURIComponent(json.data.analysisId)}`;
      }
    } catch {
      setError("Restore failed.");
    } finally {
      setRestoringId(null);
    }
  }

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ margin: "0 0 8px", fontSize: 14, color: VMB_THEME.muted }}>Already loaded a book?</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${VMB_THEME.line}`,
          background: "#fff",
          fontSize: 14,
          fontWeight: 600,
          color: VMB_THEME.ink,
          cursor: "pointer",
        }}
      >
        Restore existing analysis
      </button>

      <VmbSessionDevDiagnostic salonId={catalog?.currentSalonId} backend={catalog?.backend} />

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vmb-restore-book-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(28, 25, 23, 0.45)",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "80vh",
              overflow: "auto",
              borderRadius: 12,
              background: "#fff",
              border: `1px solid ${VMB_THEME.line}`,
              padding: "18px 20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="vmb-restore-book-title"
              style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: VMB_THEME.ink }}
            >
              Restore existing analysis
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: VMB_THEME.muted, lineHeight: 1.45 }}>
              Bind a stored analysis to your current salon session. No re-upload or reprocessing.
            </p>

            {loading ? (
              <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>Loading analyses…</p>
            ) : null}

            {error ? (
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "#b91c1c" }}>{error}</p>
            ) : null}

            {!loading && catalog && catalog.analyses.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: VMB_THEME.muted }}>
                No analyses found in the active {catalog.backend} backend.
              </p>
            ) : null}

            {!loading && catalog && catalog.analyses.length > 0 ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {catalog.analyses.map((item) => (
                  <li
                    key={item.analysisId}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${VMB_THEME.line}`,
                      background: "#fafaf9",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: 13,
                        fontFamily: "ui-monospace, monospace",
                        color: VMB_THEME.ink,
                        wordBreak: "break-all",
                      }}
                    >
                      {item.analysisId}
                    </p>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: VMB_THEME.muted }}>
                      Original salon:{" "}
                      <span style={{ fontFamily: "ui-monospace, monospace", color: VMB_THEME.ink }}>
                        {item.salonId}
                      </span>
                    </p>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: VMB_THEME.muted }}>
                      {item.clientCount} clients · {formatCreatedAt(item.createdAt)}
                      {item.sourceName ? ` · ${item.sourceName}` : ""}
                    </p>
                    <button
                      type="button"
                      disabled={restoringId === item.analysisId}
                      onClick={() => void handleRestore(item.analysisId)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: VMB_THEME.accent,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: restoringId === item.analysisId ? "wait" : "pointer",
                        opacity: restoringId === item.analysisId ? 0.7 : 1,
                      }}
                    >
                      {restoringId === item.analysisId ? "Restoring…" : "Use this book"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 16,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${VMB_THEME.line}`,
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: VMB_THEME.muted,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
