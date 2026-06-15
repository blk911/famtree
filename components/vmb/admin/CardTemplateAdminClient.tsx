"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardPreview } from "@/components/vmb/cards/CardPreview";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { buildPreviewFromTemplate } from "@/lib/vmb/card-templates/apply-card-template";
import { normalizeTemplateForEditor } from "@/lib/vmb/card-templates/template-copy-fields";
import type { VmbCardTemplate } from "@/lib/vmb/card-templates/card-template-types";
import { CARD_TEMPLATE_PREVIEW_CONTEXT } from "@/lib/vmb/card-templates/default-card-templates";
import { getAllDefaultOffers } from "@/lib/vmb/offers/default-offers";
import { resolveOfferForTemplate } from "@/lib/vmb/offers/offer-resolver";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";
import {
  getAllDefaultServiceOptions,
  getAllDefaultServices,
} from "@/lib/vmb/services/default-service-catalog";
import { resolveOptionNames, resolveServiceNames } from "@/lib/vmb/services/resolve-offer-references";
import { VMB_CARD_TYPES, type VmbCardType } from "@/lib/vmb/cards/card-types";
import { cardActionLabel } from "@/lib/vmb/cards/card-type-labels";

type Props = {
  salonId?: string;
  salonName: string;
  ownerName?: string;
};

const TYPE_LABELS: Record<VmbCardType, string> = {
  pcn_invite: "PCN Invite",
  birthday_card: "Birthday Card",
  reactivation_card: "Reactivation",
  refresh_card: "Refresh Reminder",
  vip_thank_you: "VIP Thank You",
  referral_invite: "Referral Invite",
  open_slot_fill: "Open Slot Fill",
  service_card: "Service Spotlight",
};

export function CardTemplateAdminClient({ salonId, salonName, ownerName }: Props) {
  const [templates, setTemplates] = useState<VmbCardTemplate[]>([]);
  const [offers, setOffers] = useState<VmbOffer[]>(getAllDefaultOffers());
  const [selectedType, setSelectedType] = useState<VmbCardType>("pcn_invite");
  const [draft, setDraft] = useState<VmbCardTemplate | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!salonId) return;
    const [templateRes, offerRes] = await Promise.all([
      fetch("/api/vmb/card-templates"),
      fetch("/api/vmb/offers"),
    ]);
    const data = (await templateRes.json()) as { ok?: boolean; templates?: VmbCardTemplate[] };
    const offerData = (await offerRes.json()) as { ok?: boolean; offers?: VmbOffer[] };
    if (data.ok && data.templates) {
      setTemplates(data.templates);
    }
    if (offerData.ok && offerData.offers) {
      setOffers(offerData.offers);
    }
  }, [salonId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType),
    [templates, selectedType],
  );

  useEffect(() => {
    if (selectedTemplate) {
      setDraft(normalizeTemplateForEditor({ ...selectedTemplate }));
    }
  }, [selectedTemplate]);

  const services = useMemo(() => getAllDefaultServices(), []);
  const serviceOptions = useMemo(() => getAllDefaultServiceOptions(), []);

  const linkedOffer = useMemo(() => {
    if (!draft) return undefined;
    return resolveOfferForTemplate(draft, offers);
  }, [draft, offers]);

  const linkedOfferRefs = useMemo(() => {
    if (!linkedOffer) return [] as string[];
    return [
      ...resolveServiceNames(linkedOffer.serviceIds, services),
      ...resolveOptionNames(linkedOffer.serviceOptionIds, serviceOptions),
    ];
  }, [linkedOffer, services, serviceOptions]);

  const preview = useMemo(() => {
    if (!draft) return null;
    return buildPreviewFromTemplate(
      draft,
      {
        cardType: draft.type,
        recipientName: CARD_TEMPLATE_PREVIEW_CONTEXT.clientName,
        salonName: salonName || CARD_TEMPLATE_PREVIEW_CONTEXT.salonName,
        techName: ownerName || CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
        serviceName: CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName,
        lastVisit: CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit,
        visitCount: CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount,
        referralCount: CARD_TEMPLATE_PREVIEW_CONTEXT.referralCount,
        recommendationText: CARD_TEMPLATE_PREVIEW_CONTEXT.offer,
        offers,
        services,
        serviceOptions,
      },
      ownerName || CARD_TEMPLATE_PREVIEW_CONTEXT.ownerName,
    );
  }, [draft, salonName, ownerName, offers, services, serviceOptions]);

  async function handleSave() {
    if (!draft || !salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/vmb/card-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: draft }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (data.ok) {
      setStatus("Template saved.");
      await loadTemplates();
    } else {
      setStatus(data.error ?? "Save failed.");
    }
  }

  async function handleReset() {
    if (!salonId) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/vmb/card-templates?type=${selectedType}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; template?: VmbCardTemplate; error?: string };
    setBusy(false);
    if (data.ok && data.template) {
      setDraft({ ...data.template });
      setStatus("Reset to default template.");
      await loadTemplates();
    } else {
      setStatus(data.error ?? "Reset failed.");
    }
  }

  function patchDraft(patch: Partial<VmbCardTemplate>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  if (!salonId) {
    return (
      <VmbPageFrame title="Card Templates" subtitle="Admin template manager">
        <p>Sign in to a VMB salon trial to manage outreach card templates.</p>
      </VmbPageFrame>
    );
  }

  return (
    <VmbPageFrame
      title="Card Templates"
      subtitle="Default outreach copy for invites and relationship cards"
    >
      <div className="vmb-template-admin">
        <aside className="vmb-template-admin__list">
          <p className="vmb-template-admin__list-label">Outreach types</p>
          <ul>
            {VMB_CARD_TYPES.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  className={`vmb-template-admin__type${selectedType === type ? " vmb-template-admin__type--active" : ""}`}
                  onClick={() => setSelectedType(type)}
                >
                  {TYPE_LABELS[type]}
                  {templates.find((t) => t.type === type && !t.isDefault) ? (
                    <span className="vmb-template-admin__override-dot" aria-label="Customized" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="vmb-offer-admin__links">
            <Link href="/vmb/admin/services">Services</Link>
            <Link href="/vmb/admin/offers">Offers</Link>
          </div>
        </aside>

        <section className="vmb-template-admin__editor">
          {draft ? (
            <>
              <div className="vmb-template-admin__editor-head">
                <h2>{TYPE_LABELS[draft.type]}</h2>
                <p>{cardActionLabel(draft.type)} · {draft.isDefault ? "Default" : "Salon override"}</p>
              </div>

              {linkedOffer ? (
                <div className="vmb-template-admin__linked-meta">
                  <p>
                    <strong>Uses Offer:</strong> {linkedOffer.name}
                  </p>
                  {linkedOfferRefs.length ? (
                    <p>
                      <strong>Offer references:</strong> {linkedOfferRefs.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <label className="vmb-template-admin__field">
                <span>Name</span>
                <input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} />
              </label>
              <label className="vmb-template-admin__field">
                <span>Image mode</span>
                <select
                  value={draft.imageMode}
                  onChange={(e) =>
                    patchDraft({ imageMode: e.target.value as VmbCardTemplate["imageMode"] })
                  }
                >
                  <option value="single">Single</option>
                  <option value="collage">Collage</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label className="vmb-template-admin__field">
                <span>Tone</span>
                <select
                  value={draft.tone}
                  onChange={(e) => patchDraft({ tone: e.target.value as VmbCardTemplate["tone"] })}
                >
                  <option value="warm">Warm</option>
                  <option value="direct">Direct</option>
                  <option value="playful">Playful</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label className="vmb-template-admin__field">
                <span>Personal Connection</span>
                <textarea
                  rows={3}
                  value={draft.messageTemplate}
                  onChange={(e) => patchDraft({ messageTemplate: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Relationship Benefit</span>
                <textarea
                  rows={4}
                  value={draft.relationshipBenefitTemplate ?? ""}
                  onChange={(e) => patchDraft({ relationshipBenefitTemplate: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Offer</span>
                <textarea
                  rows={2}
                  value={draft.offerTemplate ?? ""}
                  onChange={(e) => patchDraft({ offerTemplate: e.target.value })}
                />
              </label>
              <label className="vmb-template-admin__field">
                <span>Signature</span>
                <input
                  value={draft.signatureTemplate}
                  onChange={(e) => patchDraft({ signatureTemplate: e.target.value })}
                />
              </label>

              <div className="vmb-template-admin__actions">
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
              </div>
              {status ? <p className="vmb-template-admin__status">{status}</p> : null}
            </>
          ) : null}
        </section>

        <aside className="vmb-template-admin__preview">
          <p className="vmb-template-admin__preview-label">Live preview</p>
          <p className="vmb-template-admin__preview-meta">
            {CARD_TEMPLATE_PREVIEW_CONTEXT.clientName} · {CARD_TEMPLATE_PREVIEW_CONTEXT.serviceName} ·{" "}
            {CARD_TEMPLATE_PREVIEW_CONTEXT.visitCount} visits · last visit{" "}
            {CARD_TEMPLATE_PREVIEW_CONTEXT.lastVisit}
          </p>
          {preview ? (
            <CardPreview
              model={preview}
              variant={draft?.type === "pcn_invite" ? "salon-invite" : "default"}
            />
          ) : null}
        </aside>
      </div>
    </VmbPageFrame>
  );
}
