"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import { isSalonInviteMatchingActive } from "@/lib/vmb/invites/salon-invite-inventory";
import { findPublishedCopyForTemplateId } from "@/lib/vmb/invites/published-copy-matching";
import type { TodayCommandCenterSnapshot } from "@/lib/vmb/today-command-center";
import { formatTodayMoney } from "@/lib/vmb/today-command-center";
import {
  defaultInviteMessage,
  defaultInviteTitle,
  SALON_INVITE_REASON_LABELS,
  inviteTemplateIdForSalonReason,
  type InviteClientCandidate,
  type SalonInviteReasonId,
} from "./SalonInviteComposer";
import { InviteOfferRevisionPanel, type ConfirmedInviteOffer } from "./InviteOfferRevisionPanel";

type Props = {
  snapshot: TodayCommandCenterSnapshot;
  salonName: string;
  analysisId?: string;
  selectedReason: SalonInviteReasonId;
  selectedOfferRecommendations: InviteClientCandidate[];
  selectedOpportunity: InviteClientCandidate | null;
  clientNamePrefill: string;
  clientEmailPrefill: string;
  clientPhonePrefill: string;
  onSelectOpportunity: (opportunity: InviteClientCandidate) => void;
};

function contactSummary(email: string, phone: string): string {
  const parts = [email.trim(), phone.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Contact details needed";
}

function personalizeInviteCopy(value: string, clientName: string, salonName: string): string {
  return value
    .replaceAll("{clientName}", clientName || "your client")
    .replaceAll("{salonName}", salonName);
}

function todayPreviewCtaLabel(reason: SalonInviteReasonId, fallback?: string): string {
  if (reason === "birthday") return "Open my birthday gift";
  if (reason === "new-client") return "Open my welcome gift";
  return fallback?.trim() || "Open my invite";
}

function enabledSalonAddonIds(service: SalonFacingServiceOffer): string[] {
  return service.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId);
}

function salonOfferTotalCents(service: SalonFacingServiceOffer, addonIds: string[]): number {
  const selectedAddonIds = new Set(addonIds);
  return service.priceCents + service.addons
    .filter((addon) => addon.enabled && selectedAddonIds.has(addon.addonId))
    .reduce((sum, addon) => sum + addon.priceCents, 0);
}

export function TodayCommandCenter({
  snapshot,
  salonName,
  analysisId,
  selectedReason,
  selectedOfferRecommendations,
  selectedOpportunity,
  clientNamePrefill,
  clientEmailPrefill,
  clientPhonePrefill,
  onSelectOpportunity,
}: Props) {
  const [services, setServices] = useState<SalonFacingServiceOffer[]>([]);
  const [salonInviteCopies, setSalonInviteCopies] = useState<SalonInviteLocalCopy[]>([]);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState(defaultInviteTitle(selectedReason, ""));
  const [message, setMessage] = useState(defaultInviteMessage(selectedReason, salonName));
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [offerPrice, setOfferPrice] = useState("");
  const [revisingOffer, setRevisingOffer] = useState(false);
  const skipNextServiceDefaults = useRef(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [serviceResponse, inviteResponse] = await Promise.all([
          fetch("/api/vmb/salon-services", { cache: "no-store", credentials: "include" }),
          fetch("/api/vmb/salon-invites", { cache: "no-store", credentials: "include" }),
        ]);
        const json = (await serviceResponse.json()) as { ok?: boolean; services?: SalonFacingServiceOffer[] };
        const inviteJson = (await inviteResponse.json()) as { ok?: boolean; copies?: SalonInviteLocalCopy[] };
        let inviteCopies = inviteJson.ok && inviteJson.copies ? inviteJson.copies : [];
        if (inviteResponse.ok && inviteJson.ok && inviteCopies.length === 0) {
          const syncResponse = await fetch("/api/vmb/salon-invites/sync", {
            method: "POST",
            credentials: "include",
          });
          const syncJson = (await syncResponse.json()) as { ok?: boolean; copies?: SalonInviteLocalCopy[] };
          if (syncResponse.ok && syncJson.ok && syncJson.copies) {
            inviteCopies = syncJson.copies;
          }
        }
        if (!cancelled && serviceResponse.ok && json.ok) {
          const activeServices = (json.services ?? []).filter((service) => service.status === "active");
          const activeServiceIds = new Set(activeServices.map((service) => service.serviceOfferId));
          setServices(activeServices);
          setSelectedServiceId((current) => activeServiceIds.has(current) ? current : activeServices[0]?.serviceOfferId || "");
        }
        if (!cancelled && inviteResponse.ok && inviteJson.ok) {
          setSalonInviteCopies(inviteCopies.filter(isSalonInviteMatchingActive));
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setSalonInviteCopies([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isNewMemberInvite = selectedReason === "new-client";
  const selectedInviteCopy = findPublishedCopyForTemplateId(
    salonInviteCopies,
    inviteTemplateIdForSalonReason(selectedReason),
  ).copy;

  useEffect(() => {
    if (!selectedOpportunity) {
      const directName = isNewMemberInvite ? clientNamePrefill : "";
      setClientName(directName);
      setEmail(isNewMemberInvite ? clientEmailPrefill : "");
      setPhone(isNewMemberInvite ? clientPhonePrefill : "");
      setTitle(selectedInviteCopy
        ? personalizeInviteCopy(selectedInviteCopy.snapshot.headline, directName, salonName)
        : defaultInviteTitle(selectedReason, directName));
      setMessage(selectedInviteCopy
        ? personalizeInviteCopy(selectedInviteCopy.snapshot.body, directName, salonName)
        : defaultInviteMessage(selectedReason, salonName));
      setStatus(null);
      return;
    }
    const nextClientName = selectedOpportunity.clientName;
    setClientName(nextClientName);
    setEmail(clientEmailPrefill);
    setPhone(clientPhonePrefill);
    setTitle(selectedInviteCopy
      ? personalizeInviteCopy(selectedInviteCopy.snapshot.headline, nextClientName, salonName)
      : defaultInviteTitle(selectedReason, nextClientName));
    setMessage(selectedInviteCopy
      ? personalizeInviteCopy(selectedInviteCopy.snapshot.body, nextClientName, salonName)
      : selectedOpportunity.suggestedMessage || defaultInviteMessage(selectedReason, salonName));
    setStatus(null);
  }, [clientEmailPrefill, clientNamePrefill, clientPhonePrefill, isNewMemberInvite, salonName, selectedInviteCopy, selectedOpportunity, selectedReason]);

  const selectedService = services.find((service) => service.serviceOfferId === selectedServiceId);
  const selectedAddons = selectedService?.addons.filter(
    (addon) => addon.enabled && selectedAddonIds.includes(addon.addonId),
  ) ?? [];
  const hasRecipientContact = Boolean(email.trim() || phone.trim());
  const hasRecipient = isNewMemberInvite
    ? Boolean(clientName.trim() && hasRecipientContact)
    : Boolean(selectedOpportunity && clientName.trim());
  const canSend = Boolean(
    hasRecipient
      && title.trim()
      && message.trim()
      && selectedService
      && selectedInviteCopy
      && !revisingOffer
      && (!isNewMemberInvite || email.trim()),
  );
  const previewCtaLabel = todayPreviewCtaLabel(selectedReason, selectedInviteCopy?.snapshot.ctaLabel);

  useEffect(() => {
    if (!selectedService) {
      setOfferPrice("");
      return;
    }
    if (skipNextServiceDefaults.current) {
      skipNextServiceDefaults.current = false;
      return;
    }
    const enabledAddons = enabledSalonAddonIds(selectedService);
    setSelectedAddonIds(enabledAddons);
    const totalCents = salonOfferTotalCents(selectedService, enabledAddons);
    setOfferPrice((totalCents / 100).toFixed(2));
  }, [selectedService]);

  useEffect(() => {
    const preferredServiceId = selectedInviteCopy?.snapshot.serviceIds[0];
    const salonDefault = services.find((service) => service.serviceOfferId === preferredServiceId) ?? services[0];
    if (!salonDefault) return;
    const defaultAddons = enabledSalonAddonIds(salonDefault);
    const totalCents = salonOfferTotalCents(salonDefault, defaultAddons);
    skipNextServiceDefaults.current = salonDefault.serviceOfferId !== selectedServiceId;
    setSelectedServiceId(salonDefault.serviceOfferId);
    setSelectedAddonIds(defaultAddons);
    setOfferPrice((totalCents / 100).toFixed(2));
    setRevisingOffer(false);
  }, [selectedInviteCopy, selectedOpportunity?.id, selectedReason, services]);

  function useOfferRevision(next: ConfirmedInviteOffer) {
    skipNextServiceDefaults.current = next.serviceId !== selectedServiceId;
    setSelectedServiceId(next.serviceId);
    setSelectedAddonIds([...next.addonIds]);
    setOfferPrice(next.offerPrice);
  }

  async function sendInvite(): Promise<boolean> {
    if (!canSend || !selectedInviteCopy || !selectedService) return false;
    setSaving(true);
    setStatus(null);
    try {
      const totalValueCents = selectedService.priceCents + selectedAddons.reduce((sum, addon) => sum + addon.priceCents, 0);
      const offerPriceCents = Math.max(0, Math.round(Number(offerPrice || 0) * 100));
      const snapshot = {
        ...selectedInviteCopy.snapshot,
        headline: title.trim(),
        body: message.trim(),
        serviceIds: [selectedService.serviceOfferId],
        rewardIds: selectedAddons.map((addon) => addon.addonId),
        totalValue: totalValueCents / 100,
        savingsAmount: Math.max(0, totalValueCents - offerPriceCents) / 100,
        offerPrice: offerPriceCents / 100,
        valueLabel: `$${(totalValueCents / 100).toLocaleString()}`,
        priceLabel: `$${(offerPriceCents / 100).toLocaleString()}`,
        updatedAt: new Date().toISOString(),
      };
      const approvalResponse = await fetch("/api/vmb/salon-invitation-approvals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          intent: "send",
          clientName: clientName.trim(),
          clientEmail: email.trim(),
          opportunityId: selectedOpportunity?.id ?? `new-member-${Date.now()}`,
          opportunityType: SALON_INVITE_REASON_LABELS[selectedReason],
          sourceCopyId: selectedInviteCopy.id,
          sourceTemplateId: selectedInviteCopy.sourceTemplateId,
          snapshot,
          reasonText: `${SALON_INVITE_REASON_LABELS[selectedReason]} for ${clientName.trim()} from ${salonName}`,
          estimatedValue: offerPriceCents / 100,
        }),
      });
      const approvalJson = (await approvalResponse.json()) as { ok?: boolean; error?: string; approval?: { id: string } };
      if (!approvalResponse.ok || !approvalJson.ok || !approvalJson.approval?.id) {
        throw new Error(approvalJson.error ?? "Could not prepare invitation.");
      }
      const response = await fetch("/api/vmb/sent-invites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId: approvalJson.approval.id }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string; deliveryStatus?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not send invitation.");
      setStatus(json.deliveryStatus === "sent"
        ? "Invitation emailed and added to Invitations."
        : "Invitation added to Invitations. Email delivery needs a recipient email or transport configuration.");
      setRevisingOffer(false);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send invitation.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function confirmPreviewSend() {
    const ok = await sendInvite();
    if (ok) setPreviewOpen(false);
  }

  return (
    <section className="vmb-today-command" aria-label="Client selection and invite review workspace">
      <div className="vmb-today-command__head">
        <p className="vmb-today-command__kicker">Action items</p>
        <h2 className="vmb-today-command__title">{SALON_INVITE_REASON_LABELS[selectedReason]}</h2>
        <p className="vmb-today-command__lead">
          {isNewMemberInvite
            ? "Add the new member, confirm your style, then send."
            : "Choose a matching client, review the invite, then send."}
        </p>
      </div>

      <div className="vmb-today-command__sequence">
        <section className="vmb-today-command__matches" aria-label={isNewMemberInvite ? "New member details" : "Matching clients"}>
          <div className="vmb-today-command__section-head">
            <div>
              <span>Step A</span>
              <h3>{isNewMemberInvite ? "New member details" : "Matching clients"}</h3>
            </div>
            {!isNewMemberInvite ? <strong>{selectedOfferRecommendations.length}</strong> : null}
          </div>
          {isNewMemberInvite ? (
            <div className="vmb-today-command__recipient-form">
              <label>
                <span>Name</span>
                <input
                  value={clientName}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setTitle((current) => current === defaultInviteTitle(selectedReason, clientName)
                      ? defaultInviteTitle(selectedReason, nextName)
                      : current);
                    setClientName(nextName);
                  }}
                  placeholder="New member name"
                />
              </label>
              <label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" /></label>
              <label><span>Phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" /></label>
              <p>Email is required to send. Phone is saved for future SMS delivery.</p>
            </div>
          ) : selectedOfferRecommendations.length > 0 ? (
            <ul className="vmb-today-command__client-list">
              {selectedOfferRecommendations.map((opportunity) => {
                const selected = selectedOpportunity?.id === opportunity.id;
                return (
                  <li key={opportunity.id}>
                    <button
                      type="button"
                      className={selected ? "is-selected" : undefined}
                      onClick={() => onSelectOpportunity(opportunity)}
                    >
                      <span>
                        <strong>{opportunity.clientName}</strong>
                        <small>{opportunity.reason}</small>
                      </span>
                      <em>{formatTodayMoney(opportunity.estimatedValue)}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="vmb-today-command__empty">No matching clients for this touch point and search.</p>
          )}
          {!isNewMemberInvite ? <Link href={snapshot.primaryCtaHref} className="vmb-today-command__library-link">Open invite library</Link> : null}
        </section>

        <section className="vmb-today-command__review" aria-label="Selected client invite review">
          <div className="vmb-today-command__section-head">
            <div>
              <span>Step B</span>
              <h3>{SALON_INVITE_REASON_LABELS[selectedReason]}</h3>
            </div>
          </div>

          {!isNewMemberInvite && !selectedOpportunity ? (
            <div className="vmb-today-command__loaded-invite">
              <span>{SALON_INVITE_REASON_LABELS[selectedReason]}</span>
              <strong>{defaultInviteTitle(selectedReason, "")}</strong>
              <p>{defaultInviteMessage(selectedReason, salonName)}</p>
              <div className="vmb-today-command__review-empty">
                <strong>Select a client from A to personalize this invite.</strong>
                <p>The selected client&apos;s details and editable send controls will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="vmb-today-command__editor">
              <div className="vmb-today-command__selected-client">
                <span>{SALON_INVITE_REASON_LABELS[selectedReason]}</span>
                <strong>{isNewMemberInvite ? "My Style" : selectedOpportunity?.clientName}</strong>
                <p>{isNewMemberInvite ? "Confirm the salon setup for this invitation." : selectedOpportunity?.reason}</p>
              </div>

              {!isNewMemberInvite ? <div className="vmb-today-command__contact-grid">
                <label><span>Client name</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
                <label><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label><span>Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              </div> : null}

              <InviteOfferRevisionPanel
                key={`${selectedReason}-${selectedOpportunity?.id ?? "direct"}`}
                services={services}
                value={{ serviceId: selectedServiceId, addonIds: selectedAddonIds, offerPrice }}
                onUse={useOfferRevision}
                onEditingChange={setRevisingOffer}
              />

              <div className="vmb-today-command__invite-preview">
                <span>{contactSummary(email, phone)}</span>
                <strong>{title}</strong>
                <p>{message}</p>
                <small>
                  {selectedService?.displayName || "Service"}
                  {selectedAddons.length > 0 ? ` · ${selectedAddons.map((addon) => addon.label).join(" · ")}` : ""}
                  {offerPrice ? ` · $${Number(offerPrice).toFixed(2)}` : ""}
                </small>
              </div>

              <details className="vmb-today-command__copy-details">
                <summary>Edit invite copy</summary>
                <label className="vmb-today-command__field"><span>Invite title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label className="vmb-today-command__field"><span>Message</span><textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
              </details>

              <div className="vmb-today-command__send-actions">
                {!selectedInviteCopy ? (
                  <p>Approve this invite type for the salon before sending.</p>
                ) : null}
                <button type="button" disabled={!canSend || saving} onClick={() => setPreviewOpen(true)}>
                  Preview invite
                </button>
                {status ? <p>{status}</p> : null}
              </div>
            </div>
          )}
        </section>
      </div>
      {previewOpen ? (
        <div className="vmb-today-preview-modal" role="presentation" onClick={() => setPreviewOpen(false)}>
          <div
            className="vmb-today-preview-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vmb-today-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="vmb-today-preview-modal__header">
              <div>
                <p>Review before sending</p>
                <h2 id="vmb-today-preview-title">{title || "Client invite preview"}</h2>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)}>Close</button>
            </header>
            <div className="vmb-today-preview-modal__body">
              <section className="vmb-today-preview-modal__placeholder" aria-label="Send details">
                <span>Send details</span>
                <h3>Delivery setup placeholder</h3>
                <p>
                  This side will hold contact validation, delivery method, send timing, and any final salon notes.
                </p>
                <dl>
                  <div>
                    <dt>Client</dt>
                    <dd>{clientName || "Not selected"}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{contactSummary(email, phone)}</dd>
                  </div>
                  <div>
                    <dt>Touch point</dt>
                    <dd>{SALON_INVITE_REASON_LABELS[selectedReason]}</dd>
                  </div>
                </dl>
              </section>
              <section className="vmb-today-preview-modal__render" aria-label="Rendered invite">
                <span>Client invite preview</span>
                <SalonInviteCard
                  inviteTypeLabel={SALON_INVITE_REASON_LABELS[selectedReason]}
                  headline={title}
                  body={message}
                  ctaLabel={previewCtaLabel}
                  services={selectedService ? [selectedService.displayName] : []}
                  rewards={selectedAddons.map((addon) => addon.label)}
                  expirationLabel={selectedInviteCopy?.snapshot.expirationLabel}
                  ownerName={selectedInviteCopy?.snapshot.ownerName ?? "Your nail tech"}
                  ownerPhotoUrl={selectedInviteCopy?.snapshot.ownerPhotoUrl}
                  salonName={selectedInviteCopy?.snapshot.salonName ?? salonName}
                  salonLogoUrl={selectedInviteCopy?.snapshot.salonLogoUrl}
                  serviceImageUrl={selectedInviteCopy?.snapshot.serviceImageUrl}
                  inviteArtImageUrl={selectedInviteCopy?.snapshot.inviteArtImageUrl}
                  mode="client"
                  tokenContext={{
                    clientName: clientName || "your client",
                    salonName,
                    providerName: selectedInviteCopy?.snapshot.ownerName ?? "Your nail tech",
                  }}
                />
              </section>
            </div>
            <footer className="vmb-today-preview-modal__footer">
              <button type="button" className="vmb-today-preview-modal__back" onClick={() => setPreviewOpen(false)}>
                Back to edit
              </button>
              <button type="button" disabled={!canSend || saving} onClick={() => void confirmPreviewSend()}>
                {saving ? "Saving..." : isNewMemberInvite ? "Send new member invite" : "Send invite"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
