"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { writeActiveBookSession } from "@/lib/vmb/active-analysis";
import { VMB_BOOK_REFRESH_ROUTE } from "@/lib/vmb/book-load-cta";
import { VMB_THEME } from "@/lib/vmb/theme";

type DemoStatusResponse = {
  ok: boolean;
  data?: {
    configured: boolean;
    usingDemoBook: boolean;
    analysisId?: string;
  };
};

const noteStyle = {
  margin: "0 0 16px",
  fontSize: 13,
  lineHeight: 1.45,
  color: VMB_THEME.muted,
} as const;

export function UseAdminDemoBookButton({ onBound }: { onBound?: () => void }) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/vmb/active-book/demo-status", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as DemoStatusResponse;
        if (!json.ok || !json.data?.configured || json.data.usingDemoBook) return;
        if (!cancelled) setAvailable(true);
      } catch {
        // ignore
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUseDemo = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vmb/active-book/use-demo", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { analysisId: string; salonId: string };
        error?: string;
      };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Could not bind admin demo book.");
        return;
      }
      writeActiveBookSession({
        analysisId: json.data.analysisId,
        trialId: json.data.salonId,
      });
      if (onBound) {
        onBound();
      } else {
        window.location.reload();
      }
    } catch {
      setError("Could not bind admin demo book.");
    } finally {
      setBusy(false);
    }
  }, [onBound]);

  if (process.env.NODE_ENV === "production" || !available) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleUseDemo()}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${VMB_THEME.line}`,
          background: "#fff",
          fontSize: 14,
          fontWeight: 600,
          color: VMB_THEME.ink,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Binding demo book…" : "Use Admin Demo Book"}
      </button>
      {error ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b91c1c" }}>{error}</p>
      ) : null}
    </div>
  );
}

export function AdminDemoBookNote() {
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/vmb/active-book/demo-status", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as DemoStatusResponse;
        if (!cancelled) setUsingDemo(!!json.data?.usingDemoBook);
      } catch {
        // ignore
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV === "production" || !usingDemo) return null;

  return (
    <p style={noteStyle}>
      Using Admin Demo Book.{" "}
      <Link
        href={VMB_BOOK_REFRESH_ROUTE}
        style={{ color: VMB_THEME.accent, fontWeight: 600, textDecoration: "none" }}
      >
        Reprocess / Replace Book
      </Link>
    </p>
  );
}
