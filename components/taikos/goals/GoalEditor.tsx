"use client";

import { useState } from "react";
import type { TaikosGoalCategory, TaikosGoalListItem, TaikosGoalPriority } from "@/lib/taikos/goals/types";

const CATEGORIES: { value: TaikosGoalCategory; label: string }[] = [
  { value: "REVENUE", label: "Revenue" },
  { value: "PCN_GROWTH", label: "PCN Growth" },
  { value: "REFERRALS", label: "Referrals" },
  { value: "CLIENT_RETENTION", label: "Retention" },
  { value: "OPEN_SLOT_FILL", label: "Open Slot Fill" },
  { value: "REACTIVATION", label: "Reactivation" },
  { value: "CUSTOM", label: "Custom" },
];

type Props = {
  goal?: TaikosGoalListItem;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function GoalEditor({ goal, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [category, setCategory] = useState<TaikosGoalCategory>(goal?.category ?? "REVENUE");
  const [targetValue, setTargetValue] = useState(String(goal?.targetValue ?? 10));
  const [currentValue, setCurrentValue] = useState(String(goal?.currentValue ?? 0));
  const [deadline, setDeadline] = useState(goal?.deadline?.slice(0, 10) ?? "");
  const [priority, setPriority] = useState<TaikosGoalPriority>(goal?.priority ?? "medium");
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        category,
        targetValue: Number(targetValue) || 0,
        currentValue: Number(currentValue) || 0,
        deadline: deadline || undefined,
        priority,
        notes: notes.trim() || undefined,
      };

      const url = goal ? `/api/taikos/goals/${goal.goalId}` : "/api/taikos/goals";
      const method = goal ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      onSaved?.();
    } catch {
      setError("Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="taikos-goal-editor" onSubmit={(e) => void handleSubmit(e)}>
      <label className="taikos-goal-editor__field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="taikos-goal-editor__field">
        <span>Type</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as TaikosGoalCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div className="taikos-goal-editor__row">
        <label className="taikos-goal-editor__field">
          <span>Target</span>
          <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        </label>
        <label className="taikos-goal-editor__field">
          <span>Current</span>
          <input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
        </label>
      </div>
      <div className="taikos-goal-editor__row">
        <label className="taikos-goal-editor__field">
          <span>Deadline</span>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <label className="taikos-goal-editor__field">
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaikosGoalPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label className="taikos-goal-editor__field">
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
      {error ? <p className="taikos-goal-editor__error">{error}</p> : null}
      <div className="taikos-goal-editor__actions">
        {onCancel ? (
          <button type="button" className="taikos-goal-editor__btn taikos-goal-editor__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="taikos-goal-editor__btn" disabled={busy}>
          {busy ? "Saving…" : goal ? "Update Goal" : "Create Goal"}
        </button>
      </div>
    </form>
  );
}
