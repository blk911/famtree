"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBuilderShell } from "@/components/vmb/admin/AdminBuilderShell";
import { InviteBuilderInsertElements } from "@/components/vmb/admin/InviteBuilderInsertElements";
import { AdminFinalCardCheckModal } from "@/components/vmb/invites/AdminFinalCardCheckModal";
import { AdminNailInviteCard } from "@/components/vmb/invites/AdminNailInviteCard";
import {
  offerToAdminNailInviteCardOffer,
  pickDefaultAttachedOfferId,
} from "@/lib/vmb/admin/invite-offer-attachment";
import { selectInviteTemplateId } from "@/lib/vmb/invite-templates/admin-invite-template-selection";
import {
  cloneInviteTemplate,
  sanitizeInviteTemplateAgainstLegacyBleed,
} from "@/lib/vmb/invite-templates/invite-template-copy-guard";
import {
  DEFAULT_NAIL_INVITE_TEMPLATES,
  getDefaultNailInviteTemplate,
} from "@/lib/vmb/invite-templates/default-nail-invite-templates";
import { INVITE_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { VmbInviteTemplate } from "@/lib/vmb/invite-templates/invite-template-types";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
import type { VmbService } from "@/lib/vmb/services/service-types";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
};

const NAIL_INVITE_TEMPLATES_URL =
  "/api/vmb/invite-templates?categoryId=nails&includeInactive=1";

function buildInitialDrafts(): Record<string, VmbInviteTemplate> {
  const drafts: Record<string, VmbInviteTemplate> = {};
  for (const baseline of DEFAULT_NAIL_INVITE_TEMPLATES) {
    drafts[baseline.id] = cloneInviteTemplate(baseline);
  }
  return drafts;
}

export function CardTemplateAdminClient({ salonId, salonName, ownerName }: Props) {
  const [inviteDrafts, setInviteDrafts] = useState<Record<string, VmbInviteTemplate>>(buildInitialDrafts);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("nails-private-client-network");
  const [offers, setOffers] = useState<VmbOffer[]>([]);
  const [services, setServices] = useState<VmbService[]>([]);
  const [serviceOptions, setServiceOptions] = useState<VmbServiceOption[]>([]);
  const [attachedOfferId, setAttachedOfferId] = useState<string>("");
  const [finalCardCheckOpen, setFinalCardCheckOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const templateIds = useMemo(
    () => DEFAULT_NAIL_INVITE_TEMPLATES.map((row) => row.id),
    [],
  );

  const selectedDraft = inviteDrafts[selectedTemplateId];

  const selectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId((current) => selectInviteTemplateId(templateIds, templateId, current));
    },
    [templateIds],
  );

  const loadInviteTemplates = useCallback(async () => {
    const inviteRes = await fetch(NAIL_INVITE_TEMPLATES_URL, { cache: "no-store" });
    const inviteData = (await inviteRes.json()) as { ok?: boolean; templates?: VmbInviteTemplate[] };

    const nextDrafts = buildInitialDrafts();
    if (inviteData.ok && inviteData.templates?.length) {
      for (const row of inviteData.templates) {
        if (!nextDrafts[row.id]) continue;
        nextDrafts[row.id] = cloneInviteTemplate(sanitizeInviteTemplateAgainstLegacyBleed(row));
      }
    }

    setInviteDrafts(nextDrafts);
    setSelectedTemplateId((current) =>
      selectInviteTemplateId(templateIds, current, DEFAULT_NAIL_INVITE_TEMPLATES[0]!.id),
    );
  }, [templateIds]);

  const loadOffers = useCallback(async () => {
    if (!salonId) return;
    const [offerRes, serviceRes] = await Promise.all([
      fetch("/api/vmb/offers"),
      fetch("/api/vmb/services"),
    ]);
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    const serviceData = (await serviceRes.json()) as {
      ok?: boolean;
      services?: VmbService[];
      options?: VmbServiceOption[];
    };
    if (offerData.ok && offerData.offers) {
      setOffers(offerData.offers);
    }
    if (serviceData.ok && serviceData.services) {
      setServices(serviceData.services);
    }
    if (serviceData.ok && serviceData.options) {
      setServiceOptions(serviceData.options);
    }
  }, [salonId]);

  useEffect(() => {
    void loadInviteTemplates();
  }, [loadInviteTemplates]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!selectedTemplateId || offers.length === 0) return;
    const template = DEFAULT_NAIL_INVITE_TEMPLATES.find((row) => row.id === selectedTemplateId);
    setAttachedOfferId(pickDefaultAttachedOfferId(template, offers));
  }, [selectedTemplateId, offers]);

  const activeOffers = useMemo(() => offers.filter((offer) => offer.active), [offers]);

  const attachedOffer = useMemo(
    () => activeOffers.find((offer) => offer.id === attachedOfferId),
    [activeOffers, attachedOfferId],
  );

  const attachedOfferCard = useMemo(() => {
    if (!attachedOffer) return undefined;
    const serviceNames = (attachedOffer.serviceIds ?? [])
      .map((id) => services.find((service) => service.id === id)?.name)
      .filter(Boolean) as string[];
    const optionNames = (attachedOffer.serviceOptionIds ?? [])
      .map((id) => serviceOptions.find((option) => option.id === id)?.name)
      .filter(Boolean) as string[];
    return offerToAdminNailInviteCardOffer(attachedOffer, serviceNames, optionNames);
  }, [attachedOffer, serviceOptions, services]);

  const tokenContext = useMemo(
    () => ({
      ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
      clientName: INVITE_TEMPLATE_PREVIEW_CONTEXT.clientName,
      salonName: salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
      providerName: ownerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
    }),
    [ownerName, salonName],
  );

  function patchSelectedDraft(patch: Partial<VmbInviteTemplate>) {
    setInviteDrafts((prev) => ({
      ...prev,
      [selectedTemplateId]: cloneInviteTemplate({ ...prev[selectedTemplateId]!, ...patch }),
    }));
  }

  async function handleSave() {
    if (!salonId || !selectedDraft) return;
    setBusy(true);
    setStatus(null);

    const inviteRes = await fetch("/api/vmb/invite-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedDraft),
    });
    const inviteData = (await inviteRes.json()) as { ok?: boolean; template?: VmbInviteTemplate; error?: string };

    setBusy(false);
    if (!inviteRes.ok) {
      setStatus(inviteData.error ?? "Invite template save failed.");
      return;
    }

    if (inviteData.template) {
      setInviteDrafts((prev) => ({
        ...prev,
        [inviteData.template!.id]: cloneInviteTemplate(
          sanitizeInviteTemplateAgainstLegacyBleed(inviteData.template!),
        ),
      }));
    }

    setStatus("Template saved.");
  }

  async function handleReset() {
    if (!salonId || !selectedDraft) return;
    setBusy(true);
    setStatus(null);

    const baseline = getDefaultNailInviteTemplate(selectedDraft.id);
    if (baseline) {
      setInviteDrafts((prev) => ({
        ...prev,
        [selectedTemplateId]: cloneInviteTemplate(baseline),
      }));
      await fetch("/api/vmb/invite-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseline),
      });
    }

    setBusy(false);
    setStatus("Reset to default template.");
    await loadInviteTemplates();
  }

  const flowGuide = (
    <p className="vmb-invite-builder__flow-guide" aria-label="Builder flow">
      <span>Invite Type</span>
      <span className="vmb-invite-builder__flow-sep" aria-hidden="true">
        →
      </span>
      <span>Message</span>
      <span className="vmb-invite-builder__flow-sep" aria-hidden="true">
        →
      </span>
      <span>Inserts</span>
      <span className="vmb-invite-builder__flow-sep" aria-hidden="true">
        →
      </span>
      <span>Final Preview</span>
    </p>
  );

  if (!salonId) {
    return (
      <AdminBuilderShell
        title="Invite Builder"
        subtitle="Choose an invite, edit the message, attach inserts, and preview the final card."
        activeStep="templates"
        headerExtra={flowGuide}
      >
        <p className="vmb-admin-builder-grid__status">Sign in to a VMB salon trial to manage nail invite templates.</p>
      </AdminBuilderShell>
    );
  }

  return (
    <AdminBuilderShell
      title="Invite Builder"
      subtitle="Choose an invite, edit the message, attach inserts, and preview the final card."
      activeStep="templates"
      headerExtra={flowGuide}
    >
      <div className="vmb-admin-builder-grid">
        <aside className="vmb-admin-builder-grid__list">
          <p className="vmb-admin-builder-grid__list-label">Invite types</p>
          <ul role="tablist" aria-label="Nail invite template types">
            {DEFAULT_NAIL_INVITE_TEMPLATES.map((baseline) => {
              const isActive = selectedTemplateId === baseline.id;
              const draft = inviteDrafts[baseline.id];
              const isCustomized =
                Boolean(draft) &&
                (draft.body !== baseline.body ||
                  draft.ctaLabel !== baseline.ctaLabel ||
                  draft.headline !== baseline.headline);
              return (
                <li key={baseline.id}>
                  <button
                    type="button"
                    role="tab"
                    id={`card-template-tab-${baseline.id}`}
                    aria-selected={isActive}
                    aria-controls="card-template-editor-panel"
                    tabIndex={isActive ? 0 : -1}
                    className={`vmb-admin-builder-grid__type${isActive ? " vmb-admin-builder-grid__type--active" : ""}`}
                    onClick={() => selectTemplate(baseline.id)}
                  >
                    {draft?.displayName ?? baseline.displayName}
                    {isCustomized ? (
                      <span className="vmb-admin-builder-grid__override-dot" aria-label="Customized" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section
          id="card-template-editor-panel"
          role="tabpanel"
          aria-labelledby={`card-template-tab-${selectedTemplateId}`}
          className="vmb-admin-builder-grid__editor"
        >
          {selectedDraft ? (
            <>
              <h2 className="vmb-admin-builder__panel-title">{selectedDraft.displayName}</h2>

              <div key={selectedTemplateId} className="vmb-admin-builder__fields">
                <label className="vmb-admin-builder-grid__field">
                  <span>Headline</span>
                  <input
                    className="vmb-admin-builder__copy-input"
                    value={selectedDraft.headline}
                    onChange={(e) => patchSelectedDraft({ headline: e.target.value })}
                  />
                </label>
                <label className="vmb-admin-builder-grid__field">
                  <span>Body</span>
                  <textarea
                    rows={6}
                    className="vmb-admin-builder__copy-input"
                    value={selectedDraft.body}
                    onChange={(e) => patchSelectedDraft({ body: e.target.value })}
                  />
                </label>
                <label className="vmb-admin-builder-grid__field">
                  <span>CTA label</span>
                  <input
                    className="vmb-admin-builder__copy-input"
                    value={selectedDraft.ctaLabel}
                    onChange={(e) => patchSelectedDraft({ ctaLabel: e.target.value })}
                  />
                </label>
              </div>

              <InviteBuilderInsertElements
                attachedOfferId={attachedOfferId}
                activeOffers={activeOffers}
                onAttachedOfferChange={setAttachedOfferId}
              />

              <div className="vmb-admin-builder-grid__actions">
                <button type="button" className="taikos-opp-card__cta" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? "Saving…" : "Save template"}
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  disabled={busy}
                  onClick={() => void handleReset()}
                >
                  Reset to default
                </button>
                <button
                  type="button"
                  className="taikos-opp-card__cta taikos-opp-card__cta--ghost"
                  onClick={() => setFinalCardCheckOpen(true)}
                >
                  Review final card
                </button>
              </div>
              {status ? <p className="vmb-admin-builder-grid__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-admin-builder-grid__preview">
          <p className="vmb-admin-builder-grid__preview-label">Final invite preview</p>
          {selectedDraft ? (
            <AdminNailInviteCard
              key={selectedTemplateId}
              template={selectedDraft}
              tokenContext={tokenContext}
              offer={attachedOfferCard}
            />
          ) : null}
        </aside>
      </div>

      {selectedDraft ? (
        <AdminFinalCardCheckModal
          open={finalCardCheckOpen}
          onClose={() => setFinalCardCheckOpen(false)}
          template={selectedDraft}
          tokenContext={tokenContext}
          offer={attachedOfferCard}
        />
      ) : null}
    </AdminBuilderShell>
  );
}
