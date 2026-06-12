"use client";

import { useCallback, useEffect, useState } from "react";
import { AiosDraftBadge } from "@/components/taikos/drafts/AiosDraftBadge";
import { fetchTaikosJson } from "@/lib/taikos/fetch-taikos-json";
import type { TaikosDraft, TaikosDraftStatus } from "@/lib/taikos/drafts/types";
import { VMB_THEME } from "@/lib/vmb/theme";

const STATUS_OPTIONS: TaikosDraftStatus[] = [
  "draft",
  "reviewed",
  "approved",
  "ready_to_send",
];

type Props = {
  draftId: string;
  onArchived?: () => void;
};

export function AiosDraftDetail({ draftId, onArchived }: Props) {
  const [draft, setDraft] = useState<TaikosDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [status, setStatus] = useState<TaikosDraftStatus>("draft");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const outcome = await fetchTaikosJson<TaikosDraft>(
        `/api/taikos/drafts/${encodeURIComponent(draftId)}`,
      );
      if (outcome.authBlocked) {
        setDraft(null);
        setError("Drafts unavailable. Please refresh or sign back in.");
        return;
      }
      if (!outcome.ok || !outcome.data) {
        setDraft(null);
        setError(outcome.error ?? "Draft not found.");
        return;
      }
      setDraft(outcome.data);
      setTitle(outcome.data.title);
      setStatus(outcome.data.status);
      const p = outcome.data.payload;
      if (typeof p.message === "string") setMessage(p.message);
      if (typeof p.serviceName === "string") setServiceName(p.serviceName);
      if (typeof p.description === "string") setDescription(p.description);
      if (typeof p.callToAction === "string") setCallToAction(p.callToAction);
    } catch {
      setError("Could not load draft.");
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...draft.payload };
      if (draft.draftType === "service_card") {
        payload.serviceName = serviceName;
        payload.description = description;
        payload.callToAction = callToAction;
        payload.title = title;
      } else if (message) {
        payload.message = message;
      }

      const res = await fetch(`/api/taikos/drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, payload }),
      });
      const json = (await res.json()) as { ok: boolean; data?: TaikosDraft; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Save failed.");
        return;
      }
      setDraft(json.data);
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToQueue() {
    if (!draft) return;
    setSaving(true);
    setQueueMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/taikos/queue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { message: string }; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not add to queue.");
        return;
      }
      setQueueMessage(json.data?.message ?? "Added to queue. No message sent yet.");
      setStatus("approved");
    } catch {
      setError("Could not add to queue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/taikos/drafts/${encodeURIComponent(draftId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok: boolean };
      if (res.ok && json.ok) {
        onArchived?.();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="vmb-page-state" style={{ color: VMB_THEME.muted }}>Loading draft…</p>;
  }
  if (!draft) {
    return <p className="vmb-page-state" style={{ color: VMB_THEME.muted }}>{error ?? "Draft not found."}</p>;
  }

  const isServiceCard = draft.draftType === "service_card";
  const hasMessage =
    draft.draftType === "pcn_invite" ||
    draft.draftType === "campaign" ||
    draft.draftType === "referral_ask" ||
    draft.draftType === "reactivation" ||
    draft.draftType === "calendar_gap";

  return (
    <div className="aios-draft-detail">
      <div className="aios-draft-detail__head">
        <AiosDraftBadge draftType={draft.draftType} status={draft.status} />
        <p className="aios-draft-detail__saved">Draft saved. No message sent yet.</p>
      </div>

      <label className="aios-draft-detail__field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      {isServiceCard ? (
        <>
          <label className="aios-draft-detail__field">
            <span>Service name</span>
            <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          </label>
          <label className="aios-draft-detail__field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <label className="aios-draft-detail__field">
            <span>Call to action</span>
            <input value={callToAction} onChange={(e) => setCallToAction(e.target.value)} />
          </label>
        </>
      ) : null}

      {hasMessage ? (
        <label className="aios-draft-detail__field">
          <span>Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
        </label>
      ) : null}

      <label className="aios-draft-detail__field">
        <span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as TaikosDraftStatus)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      {draft.linkedGoalId || typeof draft.payload.linkedGoalId === "string" ? (
        <p className="aios-draft-detail__goal">
          Goal linked · review from Today or your draft workspace
        </p>
      ) : null}

      {error ? <p className="aios-draft-detail__error">{error}</p> : null}
      {queueMessage ? <p className="aios-draft-detail__queued">{queueMessage}</p> : null}

      <div className="aios-draft-detail__actions">
        <button type="button" className="aios-draft-detail__save" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button type="button" className="aios-draft-detail__queue" onClick={() => void handleAddToQueue()} disabled={saving}>
          Add To Queue
        </button>
        <button type="button" className="aios-draft-detail__archive" onClick={() => void handleArchive()} disabled={saving}>
          Archive
        </button>
        <button type="button" className="aios-draft-detail__send" disabled title="Send coming later">
          Send coming later
        </button>
      </div>
    </div>
  );
}
