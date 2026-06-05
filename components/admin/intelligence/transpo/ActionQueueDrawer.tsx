"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SERVICE_CATEGORY_LABELS, type TranspoServiceCategory } from "@/lib/intelligence/transpo/market-gaps/types";
import type {
  TranspoActionDecision,
  TranspoActionQueueRecord,
  TranspoActionStatus,
} from "@/lib/intelligence/transpo/action-queue/action-types";

type Props = {
  record: TranspoActionQueueRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (record: TranspoActionQueueRecord) => void;
};

const DECISIONS: { id: TranspoActionDecision; label: string }[] = [
  { id: "investigate", label: "Investigate" },
  { id: "partner", label: "Partner" },
  { id: "acquire", label: "Acquire" },
  { id: "launch", label: "Launch" },
  { id: "watch", label: "Watch" },
  { id: "reject", label: "Reject" },
];

const STATUSES: { id: TranspoActionStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "waiting", label: "Waiting" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Closed" },
];

function btn(active: boolean): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 10px",
    borderRadius: 8,
    border: active ? "1px solid #4338ca" : "1px solid #e7e5e4",
    background: active ? "#eef2ff" : "#fafaf9",
    color: active ? "#4338ca" : "#57534e",
    cursor: "pointer",
  };
}

export function ActionQueueDrawer({ record, open, onClose, onUpdated }: Props) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<TranspoActionQueueRecord | null>(null);

  useEffect(() => {
    if (record) {
      setLocal(record);
      setNotes(record.notes ?? "");
    }
  }, [record]);

  const patch = useCallback(
    async (patchBody: { decision?: TranspoActionDecision; status?: TranspoActionStatus; notes?: string }) => {
      if (!local) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/intelligence/transpo/action-queue/${local.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        const data = await res.json();
        if (data.ok && data.record) {
          setLocal(data.record);
          onUpdated?.(data.record);
        }
      } finally {
        setSaving(false);
      }
    },
    [local, onUpdated],
  );

  async function saveNotes() {
    if (!local) return;
    await patch({ notes });
  }

  if (!open || !local) return null;
  const svc = local.serviceCategory as TranspoServiceCategory;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 460, background: "rgba(28,25,23,0.45)", display: "flex", justifyContent: "flex-end" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(580px, 100vw)", height: "100%", background: "#fff", borderLeft: "1px solid #e7e5e4", overflow: "auto", padding: "20px 22px 40px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{local.county}, {local.state}</h2>
            <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 6px" }}>{SERVICE_CATEGORY_LABELS[svc] ?? local.serviceCategory}</p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#4338ca", background: "#eef2ff" }}>
              Actionability {local.actionabilityScore} · {local.decision} · {local.status}
            </span>
          </div>
          <button type="button" onClick={onClose} style={{ border: "1px solid #e7e5e4", background: "#fafaf9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>OVERVIEW</div>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: "#44403c", marginBottom: 14 }}>
          <div>Deficit: <strong>{local.deficitScore}</strong> · Confidence: <strong>{local.confidenceScore}</strong> · Severity: <strong>{local.severity}</strong></div>
          <div>Providers: <strong>{local.providerCount ?? "—"}</strong> · Payer: <strong>{local.payerName ?? "—"}</strong></div>
          <div style={{ marginTop: 6 }}>{local.recommendedPlay}</div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>DECISION</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {DECISIONS.map((d) => (
            <button key={d.id} type="button" disabled={saving} onClick={() => patch({ decision: d.id })} style={btn(local.decision === d.id)}>
              {d.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>STATUS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {STATUSES.map((s) => (
            <button key={s.id} type="button" disabled={saving} onClick={() => patch({ status: s.id })} style={btn(local.status === s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>NOTES</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Execution notes, contacts, next steps…"
          style={{ width: "100%", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid #e7e5e4", marginBottom: 8, resize: "vertical" }}
        />
        <button type="button" onClick={saveNotes} disabled={saving} style={{ ...btn(false), marginBottom: 16 }}>
          {saving ? "Saving…" : "Save Notes"}
        </button>

        <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>LINKS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href={`/admin/intelligence/transpo/county-opportunities?county=${encodeURIComponent(local.county)}&state=${local.state}&service=${local.serviceCategory}`} style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            County Opportunity Dossier →
          </Link>
          <Link href={`/admin/intelligence/transpo/provider-dossiers?county=${encodeURIComponent(local.county)}&state=${local.state}`} style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            Provider Dossiers →
          </Link>
          <Link href={`/admin/intelligence/transpo/service-deficits?county=${encodeURIComponent(local.county)}&state=${local.state}`} style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            Service Deficits →
          </Link>
          <Link href="/admin/intelligence/transpo/opportunity-radar" style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>
            Opportunity Radar →
          </Link>
        </div>
      </div>
    </div>
  );
}
