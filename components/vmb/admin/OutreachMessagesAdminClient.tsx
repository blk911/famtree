"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { renderOutreachTemplate, buildOutreachDraftCopy } from "@/lib/vmb/invites/outreach-message-presets";
import type { SalonOutreachPreset } from "@/lib/vmb/invites/outreach-preset-types";
import { INVITE_SECTION_LABELS } from "@/lib/vmb/invites/sections";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  salonId?: string;
  salonName?: string;
};

const PREVIEW_VARS = {
  salonName: "Blue Mountain Salon",
  clientName: "Grace Nguyen",
  firstName: "Grace",
  welcomeMessage: "Welcome — we're glad you found us.",
  reason: "it's been a few months since your last visit",
  suggestedAction: "Book a refresh",
  promptText: "Would you be open to introducing someone you trust to the salon?",
};

export function OutreachMessagesAdminClient({ salonId, salonName = "Your Salon" }: Props) {
  const [presets, setPresets] = useState<SalonOutreachPreset[]>([]);
  const [selectedId, setSelectedId] = useState<SalonOutreachPreset["id"]>("private_client_network");
  const [draft, setDraft] = useState<SalonOutreachPreset | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPresets = useCallback(async () => {
    if (!salonId) return;
    const res = await fetch("/api/vmb/outreach-presets", { cache: "no-store", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean; presets?: SalonOutreachPreset[] };
    if (json.ok && json.presets) {
      setPresets(json.presets);
    }
  }, [salonId]);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  const selected = useMemo(
    () => presets.find((preset) => preset.id === selectedId) ?? presets[0] ?? null,
    [presets, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setDraft({ ...selected });
    }
  }, [selected]);

  const previewVars = { ...PREVIEW_VARS, salonName: salonName.trim() || PREVIEW_VARS.salonName };

  async function savePreset() {
    if (!salonId || !draft) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/vmb/outreach-presets", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: draft }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus(json.error ?? "Could not save outreach preset.");
        return;
      }
      setStatus("Saved outreach preset.");
      await loadPresets();
    } finally {
      setBusy(false);
    }
  }

  async function resetPreset() {
    if (!salonId || !draft) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/vmb/outreach-presets?id=${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; preset?: SalonOutreachPreset };
      if (!res.ok || !json.ok || !json.preset) {
        setStatus(json.error ?? "Could not reset outreach preset.");
        return;
      }
      setDraft(json.preset);
      setStatus("Reset to canonical default.");
      await loadPresets();
    } finally {
      setBusy(false);
    }
  }

  if (!salonId) {
    return (
      <VmbPageFrame title="Outreach Messages" subtitle="Admin template manager">
        <p>Sign in to a VMB salon trial to manage outreach send/preview presets.</p>
      </VmbPageFrame>
    );
  }

  if (!draft) {
    return (
      <VmbPageFrame title="Outreach Messages" subtitle="Loading outreach presets…">
        <p className="vmb-page-state">Loading…</p>
      </VmbPageFrame>
    );
  }

  const draftCopy = buildOutreachDraftCopy(draft.id, previewVars);
  const subjectPreview = draftCopy.subject;
  const messagePreview = draftCopy.editableMessage;
  const footerPreview = renderOutreachTemplate(draft.lockedFooterTemplate, previewVars);

  return (
    <VmbPageFrame
      title="Outreach Messages"
      subtitle="Edit send/preview modal copy. Product flows read salon overrides first, then canonical defaults."
    >
      <div className="vmb-template-admin">
        <aside className="vmb-template-admin__sidebar">
          <p className="vmb-template-admin__list-label">Outreach presets</p>
          <ul className="vmb-template-admin__type-list">
            {presets.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  className={
                    preset.id === draft.id
                      ? "vmb-template-admin__type-btn vmb-template-admin__type-btn--active"
                      : "vmb-template-admin__type-btn"
                  }
                  onClick={() => setSelectedId(preset.id)}
                >
                  {INVITE_SECTION_LABELS[preset.id] ?? preset.label}
                  {!preset.isDefault ? (
                    <span className="vmb-template-admin__override-dot" aria-label="Customized" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="vmb-template-admin__editor">
          <p style={{ margin: "0 0 8px", fontSize: 13, color: VMB_THEME.muted }}>
            {draft.isDefault ? "Using canonical default" : "Salon override active"}
          </p>

          <label className="vmb-template-admin__field">
            <span>Name</span>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Description</span>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Subject template</span>
            <textarea
              rows={2}
              value={draft.subjectTemplate}
              onChange={(e) => setDraft({ ...draft, subjectTemplate: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Message template</span>
            <textarea
              rows={10}
              value={draft.messageTemplate}
              onChange={(e) => setDraft({ ...draft, messageTemplate: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Locked footer template</span>
            <textarea
              rows={3}
              value={draft.lockedFooterTemplate}
              onChange={(e) => setDraft({ ...draft, lockedFooterTemplate: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Primary CTA label</span>
            <input
              value={draft.primaryCtaLabel}
              onChange={(e) => setDraft({ ...draft, primaryCtaLabel: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>SMS channel hint</span>
            <input
              value={draft.channelHintSms}
              onChange={(e) => setDraft({ ...draft, channelHintSms: e.target.value })}
            />
          </label>

          <label className="vmb-template-admin__field">
            <span>Email channel hint</span>
            <input
              value={draft.channelHintEmail}
              onChange={(e) => setDraft({ ...draft, channelHintEmail: e.target.value })}
            />
          </label>

          <label className="vmb-offer-admin__checkbox">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            <span>Active</span>
          </label>

          <div className="vmb-template-admin__edit-actions">
            <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void savePreset()}>
              {busy ? "Saving…" : "Save preset"}
            </button>
            <button
              type="button"
              className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
              disabled={busy}
              onClick={() => void resetPreset()}
            >
              Reset to default
            </button>
          </div>

          {status ? <p className="vmb-template-admin__status">{status}</p> : null}

          <section className="vmb-template-admin__preview">
            <h3 className="vmb-template-admin__preview-title">Send modal preview</h3>
            <p className="vmb-template-admin__preview-label">Subject</p>
            <pre className="vmb-template-admin__preview-block">{subjectPreview}</pre>
            <p className="vmb-template-admin__preview-label">Message</p>
            <pre className="vmb-template-admin__preview-block">{messagePreview}</pre>
            <p className="vmb-template-admin__preview-label">Locked footer</p>
            <pre className="vmb-template-admin__preview-block">{footerPreview}</pre>
          </section>
        </div>
      </div>
    </VmbPageFrame>
  );
}
