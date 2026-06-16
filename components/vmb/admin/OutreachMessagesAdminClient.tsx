"use client";

import { useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import {
  listOutreachMessagePresets,
  renderOutreachTemplate,
  type OutreachMessagePreset,
} from "@/lib/vmb/invites/outreach-message-presets";
import { INVITE_SECTION_LABELS } from "@/lib/vmb/invites/sections";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
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

export function OutreachMessagesAdminClient({ salonName = "Your Salon" }: Props) {
  const presets = useMemo(() => listOutreachMessagePresets(), []);
  const [selectedId, setSelectedId] = useState<OutreachMessagePreset["id"]>(
    presets[0]?.id ?? "private_client_network",
  );

  const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0];
  const previewVars = { ...PREVIEW_VARS, salonName: salonName.trim() || PREVIEW_VARS.salonName };

  if (!selected) {
    return (
      <VmbPageFrame title="Outreach Messages" subtitle="No outreach presets configured.">
        <p className="vmb-page-state">Outreach preset catalog is empty.</p>
      </VmbPageFrame>
    );
  }

  const subjectPreview = renderOutreachTemplate(selected.subjectTemplate, previewVars);
  const messagePreview = renderOutreachTemplate(selected.messageTemplate, previewVars);
  const footerPreview = renderOutreachTemplate(selected.lockedFooterTemplate, previewVars);

  return (
    <VmbPageFrame
      title="Outreach Messages"
      subtitle="Canonical send/preview modal copy — product modals read from outreach presets, not inline strings."
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
                    preset.id === selected.id
                      ? "vmb-template-admin__type-btn vmb-template-admin__type-btn--active"
                      : "vmb-template-admin__type-btn"
                  }
                  onClick={() => setSelectedId(preset.id)}
                >
                  {INVITE_SECTION_LABELS[preset.id] ?? preset.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="vmb-template-admin__editor">
          <p style={{ margin: "0 0 8px", fontSize: 13, color: VMB_THEME.muted }}>
            {selected.description}
          </p>

          <label className="vmb-template-admin__field">
            <span>Subject template</span>
            <textarea readOnly rows={2} value={selected.subjectTemplate} />
          </label>

          <label className="vmb-template-admin__field">
            <span>Message template</span>
            <textarea readOnly rows={10} value={selected.messageTemplate} />
          </label>

          <label className="vmb-template-admin__field">
            <span>Locked footer template</span>
            <textarea readOnly rows={3} value={selected.lockedFooterTemplate} />
          </label>

          <div className="vmb-template-admin__meta-grid">
            <div>
              <p className="vmb-template-admin__meta-label">Primary CTA label</p>
              <p className="vmb-template-admin__meta-value">{selected.primaryCtaLabel}</p>
            </div>
            <div>
              <p className="vmb-template-admin__meta-label">SMS hint</p>
              <p className="vmb-template-admin__meta-value">{selected.channelHintSms}</p>
            </div>
            <div>
              <p className="vmb-template-admin__meta-label">Email hint</p>
              <p className="vmb-template-admin__meta-value">{selected.channelHintEmail}</p>
            </div>
          </div>

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
