"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { VmbCard } from "@/components/vmb/VmbCard";
import { VmbPageIntro } from "@/components/vmb/VmbPageIntro";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { TrustedProviderIntroRequest } from "@/types/vmb/trusted-circle";

const CATEGORIES = ["Nails", "Skin", "Wax", "Lashes", "Massage"] as const;

export function VmbNetworkClient() {
  const activeAnalysisId = useVmbActiveAnalysis();
  const [requests, setRequests] = useState<TrustedProviderIntroRequest[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [salonName, setSalonName] = useState("Beauty Tribe Salon");
  const [busy, setBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vmb/trusted-intro", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: TrustedProviderIntroRequest[] }) => {
        if (json.ok && Array.isArray(json.data)) setRequests(json.data);
        else setRequests([]);
      })
      .catch(() => setRequests([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeCategory || !clientName.trim()) return;
    setBusy(true);
    setError(null);
    setDraftMessage(null);
    try {
      const res = await fetch("/api/vmb/trusted-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: salonName.trim(),
          clientName: clientName.trim(),
          requestedCategory: activeCategory,
          providerName: providerName.trim() || undefined,
          analysisId: activeAnalysisId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: TrustedProviderIntroRequest;
        error?: string;
      };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Could not create intro request.");
        return;
      }
      setDraftMessage(json.data.messageDraft);
      setRequests((prev) => [json.data!, ...prev]);
      setClientName("");
      setProviderName("");
      setActiveCategory(null);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 72px" }}>
      <VmbPageIntro
        title="Trusted Beauty Circle"
        description="Ask clients you trust for warm introductions to their favorite providers."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ marginBottom: 32 }}>
        {CATEGORIES.map((category) => {
          const filled = requests.find(
            (r) => r.requestedCategory.toLowerCase() === category.toLowerCase(),
          );
          return (
            <VmbCard key={category}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: VMB_THEME.accent,
                }}
              >
                {category}
              </p>
              {filled ? (
                <>
                  <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
                    {filled.providerName ?? "Intro requested"}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: VMB_THEME.muted }}>
                    via {filled.clientName}
                  </p>
                </>
              ) : (
                <p style={{ margin: "0 0 14px", fontSize: 14, color: VMB_THEME.muted }}>
                  No provider yet — ask a client for an intro.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(category);
                  setDraftMessage(null);
                  setError(null);
                }}
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${VMB_THEME.line}`,
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: VMB_THEME.accent,
                }}
              >
                Ask Client For Intro
              </button>
            </VmbCard>
          );
        })}
      </div>

      {activeCategory ? (
        <VmbCard padding="lg" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>
            Request intro — {activeCategory}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
            <input
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              style={fieldStyle}
            />
            <input
              placeholder="Provider name (optional)"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              style={fieldStyle}
            />
            {error ? <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: VMB_THEME.accent,
                color: "#fff",
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Drafting…" : "Create intro request"}
            </button>
          </form>
        </VmbCard>
      ) : null}

      {draftMessage ? (
        <VmbCard padding="lg">
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: VMB_THEME.accent,
            }}
          >
            Draft message
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: VMB_THEME.ink }}>
            {draftMessage}
          </p>
        </VmbCard>
      ) : null}

      {requests.length > 0 ? (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: VMB_THEME.muted }}>
            Recent intro requests
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {requests.slice(0, 5).map((r) => (
              <VmbCard key={r.requestId} padding="sm">
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>{r.clientName}</strong> → {r.requestedCategory}
                  {r.providerName ? ` (${r.providerName})` : ""}
                </p>
              </VmbCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  fontSize: 15,
  boxSizing: "border-box",
};
