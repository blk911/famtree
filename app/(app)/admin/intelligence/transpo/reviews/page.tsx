"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import type { TranspoCarrierReview } from "@/lib/intelligence/transpo/verification-types";

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  borderBottom: "1px solid #f0ede8",
  background: "#fafaf9",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#57534e",
  borderBottom: "1px solid #f5f4f2",
};

export default function TranspoReviewsPage() {
  const [reviews, setReviews] = useState<TranspoCarrierReview[]>([]);
  const [storage, setStorage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/intelligence/transpo/reviews", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setReviews(data.reviews ?? []);
      setStorage(data.storage?.path ?? data.storage?.backend ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="reviews" />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Reviews</h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
          Human carrier review decisions — approve, reject, or watchlist before qualified targets.
        </p>
        {storage ? <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 6 }}>Storage: {storage}</p> : null}
      </div>

      {error ? <div style={{ marginBottom: 16, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div> : null}

      <p style={{ fontSize: 12, marginBottom: 12 }}>
        <Link href="/admin/intelligence/transpo/opportunities" style={{ color: "#4338ca", fontWeight: 700 }}>Score carriers in Opportunities →</Link>
        {" · "}
        <Link href="/admin/intelligence/transpo/qualified-targets" style={{ color: "#4338ca", fontWeight: 700 }}>Qualified Targets →</Link>
      </p>

      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Carrier", "Status", "Reviewed By", "Updated", "Notes"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ ...td, textAlign: "center" }}>Loading…</td></tr>
              : reviews.length === 0 ? <tr><td colSpan={5} style={{ ...td, textAlign: "center" }}>No reviews yet.</td></tr>
              : reviews.map((r) => (
                <tr key={r.carrierId}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.carrierId}</td>
                  <td style={td}>{r.reviewStatus}</td>
                  <td style={td}>{r.reviewedBy ?? "—"}</td>
                  <td style={td}>{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}</td>
                  <td style={td}>{r.reviewNotes ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
