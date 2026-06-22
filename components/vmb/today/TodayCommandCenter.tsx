"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import type { TodayCommandCenterSnapshot } from "@/lib/vmb/today-command-center";
import { formatTodayMoney } from "@/lib/vmb/today-command-center";
import {
  defaultInviteMessage,
  defaultInviteTitle,
  SALON_INVITE_REASON_LABELS,
  type InviteClientCandidate,
  type SalonInviteReasonId,
} from "./SalonInviteComposer";

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
  const [newMemberCopy, setNewMemberCopy] = useState<SalonInviteLocalCopy | null>(null);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState(defaultInviteTitle(selectedReason, ""));
  const [message, setMessage] = useState(defaultInviteMessage(selectedReason, salonName));
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [offerPrice, setOfferPrice] = useState("");
  const [revisingOffer, setRevisingOffer] = useState(false);
  const [revisionServiceId, setRevisionServiceId] = useState("");
  const [revisionAddonIds, setRevisionAddonIds] = useState<string[]>([]);
  const [revisionOfferPrice, setRevisionOfferPrice] = useState("");
  const skipNextServiceDefaults = useRef(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
        if (!cancelled && serviceResponse.ok && json.ok) {
          const activeServices = (json.services ?? []).filter((service) => service.status === "active");
          const activeServiceIds = new Set(activeServices.map((service) => service.serviceOfferId));
          setServices(activeServices);
          setSelectedServiceId((current) => activeServiceIds.has(current) ? current : activeServices[0]?.serviceOfferId || "");
        }
        if (!cancelled && inviteResponse.ok && inviteJson.ok) {
          setNewMemberCopy(
            (inviteJson.copies ?? []).find(
              (copy) => copy.sourceTemplateId === "nails-new-client-welcome" && copy.inventoryStatus !== "paused",
            ) ?? null,
          );
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setNewMemberCopy(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isNewMemberInvite = selectedReason === "new-client";

  useEffect(() => {
    if (!selectedOpportunity) {
      const directName = isNewMemberInvite ? clientNamePrefill : "";
      setClientName(directName);
      setEmail(isNewMemberInvite ? clientEmailPrefill : "");
      setPhone(isNewMemberInvite ? clientPhonePrefill : "");
      setTitle(defaultInviteTitle(selectedReason, directName));
      setMessage(defaultInviteMessage(selectedReason, salonName));
      setStatus(null);
      return;
    }
    const nextClientName = selectedOpportunity.clientName;
    setClientName(nextClientName);
    setEmail(clientEmailPrefill);
    setPhone(clientPhonePrefill);
    setTitle(defaultInviteTitle(selectedReason, nextClientName));
    setMessage(selectedOpportunity.suggestedMessage || defaultInviteMessage(selectedReason, salonName));
    setStatus(null);
  }, [clientEmailPrefill, clientNamePrefill, clientPhonePrefill, isNewMemberInvite, salonName, selectedOpportunity, selectedReason]);

  const selectedService = services.find((service) => service.serviceOfferId === selectedServiceId);
  const selectedAddons = selectedService?.addons.filter(
    (addon) => addon.enabled && selectedAddonIds.includes(addon.addonId),
  ) ?? [];
  const serviceOptions = selectedService?.addons.filter((addon) => addon.enabled) ?? [];
  const revisionService = services.find((service) => service.serviceOfferId === revisionServiceId);
  const revisionOptions = revisionService?.addons.filter((addon) => addon.enabled) ?? [];
  const hasRecipientContact = Boolean(email.trim() || phone.trim());
  const hasRecipient = isNewMemberInvite
    ? Boolean(clientName.trim() && hasRecipientContact)
    : Boolean(selectedOpportunity && clientName.trim());
  const canSend = isNewMemberInvite
    ? Boolean(hasRecipient && email.trim() && title.trim() && message.trim() && selectedService && newMemberCopy && !revisingOffer)
    : Boolean(hasRecipient && title.trim() && message.trim() && selectedService);

  useEffect(() => {
    if (!selectedService) {
      setOfferPrice("");
      return;
    }
    if (skipNextServiceDefaults.current) {
      skipNextServiceDefaults.current = false;
      return;
    }
    const enabledAddons = selectedService.addons.filter((addon) => addon.enabled);
    setSelectedAddonIds(enabledAddons.map((addon) => addon.addonId));
    const totalCents = selectedService.priceCents + enabledAddons.reduce((sum, addon) => sum + addon.priceCents, 0);
    setOfferPrice((totalCents / 100).toFixed(2));
  }, [selectedService]);

  function beginRevision() {
    setRevisionServiceId(selectedServiceId);
    setRevisionAddonIds([...selectedAddonIds]);
    setRevisionOfferPrice(offerPrice);
    setRevisingOffer(true);
  }

  function selectRevisionService(serviceId: string) {
    const service = services.find((row) => row.serviceOfferId === serviceId);
    setRevisionServiceId(serviceId);
    const addonIds = service?.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId) ?? [];
    setRevisionAddonIds(addonIds);
    const totalCents = (service?.priceCents ?? 0) + (service?.addons ?? [])
      .filter((addon) => addon.enabled && addonIds.includes(addon.addonId))
      .reduce((sum, addon) => sum + addon.priceCents, 0);
    setRevisionOfferPrice((totalCents / 100).toFixed(2));
  }

  function toggleRevisionAddon(addonId: string) {
    if (!revisionService) return;
    const next = revisionAddonIds.includes(addonId)
      ? revisionAddonIds.filter((id) => id !== addonId)
      : [...revisionAddonIds, addonId];
    setRevisionAddonIds(next);
    const totalCents = revisionService.priceCents + revisionService.addons
      .filter((addon) => addon.enabled && next.includes(addon.addonId))
      .reduce((sum, addon) => sum + addon.priceCents, 0);
    setRevisionOfferPrice((totalCents / 100).toFixed(2));
  }

  function useRevision() {
    skipNextServiceDefaults.current = revisionServiceId !== selectedServiceId;
    setSelectedServiceId(revisionServiceId);
    setSelectedAddonIds([...revisionAddonIds]);
    setOfferPrice(revisionOfferPrice);
    setRevisingOffer(false);
  }

  async function saveInviteStub() {
    if (!canSend) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vmb/invite-events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "invite_created",
          payload: {
            clientName: clientName.trim(),
            inviteCategory: selectedReason,
            templateType: SALON_INVITE_REASON_LABELS[selectedReason],
            analysisId,
            sourcePage: "vmb-today-command-center",
            salonDisplayName: salonName,
            recipientContactSummary: contactSummary(email, phone),
            recipientEmail: email.trim(),
            recipientPhone: phone.trim(),
            inviteTitle: title.trim(),
            inviteMessage: message.trim(),
            selectedService: selectedService?.displayName ?? "",
            selectedReward: selectedAddons.map((addon) => addon.label).join(" · "),
            selectedPriceCents: Math.max(0, Math.round(Number(offerPrice || 0) * 100)),
            deliveryStatus: "stubbed_internal",
          },
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      setStatus(response.ok && json.ok ? "Invite stub saved internally. Delivery is not live yet." : json.error ?? "Could not save invite stub.");
    } catch {
      setStatus("Could not save invite stub.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite() {
    if (!canSend) return;
    setSaving(true);
    setStatus(null);
    try {
      const totalValueCents = selectedService!.priceCents + selectedAddons.reduce((sum, addon) => sum + addon.priceCents, 0);
      const offerPriceCents = Math.max(0, Math.round(Number(offerPrice || 0) * 100));
      const snapshot = {
        ...newMemberCopy!.snapshot,
        headline: title.trim(),
        body: message.trim(),
        serviceIds: [selectedService!.serviceOfferId],
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
          clientName: clientName.trim(),
          clientEmail: email.trim(),
          opportunityId: `new-member-${Date.now()}`,
          opportunityType: SALON_INVITE_REASON_LABELS[selectedReason],
          sourceCopyId: newMemberCopy!.id,
          sourceTemplateId: newMemberCopy!.sourceTemplateId,
          snapshot,
          reasonText: `New member offer from ${salonName}`,
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
      setStatus(json.deliveryStatus === "sent" ? "Invitation emailed and added to Invitations." : "Invitation added to Invitations. Email delivery is not configured.");
      setRevisingOffer(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send invitation.");
    } finally {
      setSaving(false);
    }
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
              <h3>{isNewMemberInvite ? "Confirm My Style and send" : "Review and send"}</h3>
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

              {isNewMemberInvite ? (
                <div className="vmb-today-command__style-builder">
                  {!revisingOffer ? (
                    <div className="vmb-today-command__style-summary">
                      <div><span>Salon default</span><strong>{selectedService?.displayName ?? "No active service"}</strong></div>
                      {selectedAddons.map((addon) => (
                        <div key={addon.addonId}>
                          <span>{addon.label}</span>
                          <strong>+${(addon.priceCents / 100).toFixed(2)}</strong>
                        </div>
                      ))}
                      <div className="vmb-today-command__style-summary-total">
                        <span>Offer total</span><strong>${Number(offerPrice || 0).toFixed(2)}</strong>
                      </div>
                      <button type="button" onClick={beginRevision}>Revise this offer</button>
                    </div>
                  ) : (
                    <>
                      <div className="vmb-today-command__style-controls">
                        <label>
                          <span>Active service</span>
                          <select value={revisionServiceId} onChange={(event) => selectRevisionService(event.target.value)}>
                            {services.length === 0 ? <option value="">No active services</option> : null}
                            {services.map((service) => (
                              <option key={service.serviceOfferId} value={service.serviceOfferId}>
                                {service.displayName} · ${(service.priceCents / 100).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="vmb-today-command__price-field">
                          <span>Adjust offer price</span>
                          <div><b>$</b><input type="number" min="0" step="0.01" value={revisionOfferPrice} onChange={(event) => setRevisionOfferPrice(event.target.value)} /></div>
                        </label>
                      </div>
                      {revisionOptions.length > 0 ? (
                        <div>
                          <span>Custom add-ons</span>
                          <div className="vmb-today-command__revision-pills">
                            {revisionOptions.map((option) => {
                              const selected = revisionAddonIds.includes(option.addonId);
                              return (
                                <button
                                  key={option.addonId}
                                  type="button"
                                  className={selected ? "is-selected" : undefined}
                                  aria-pressed={selected}
                                  onClick={() => toggleRevisionAddon(option.addonId)}
                                >
                                  {selected ? <span aria-hidden="true">✓</span> : null}
                                  <strong>{option.label}</strong>
                                  <small>+${(option.priceCents / 100).toFixed(2)}</small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : <p className="vmb-today-command__style-note">No custom add-ons are available for this service.</p>}
                      <div className="vmb-today-command__revision-actions">
                        <button type="button" className="vmb-today-command__revision-done" onClick={useRevision}>Use this offer</button>
                        <button type="button" className="vmb-today-command__revision-cancel" onClick={() => setRevisingOffer(false)}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              ) : <div className="vmb-today-command__contact-grid">
                <label>
                  <span>Active service</span>
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {services.length === 0 ? <option value="">No active services</option> : null}
                    {services.map((service) => <option key={service.serviceOfferId} value={service.serviceOfferId}>{service.displayName}</option>)}
                  </select>
                </label>
                <label>
                  <span>Reward / option</span>
                  <select value={selectedAddonIds[0] ?? ""} onChange={(event) => setSelectedAddonIds(event.target.value ? [event.target.value] : [])}>
                    {serviceOptions.length === 0 ? <option value="">No active rewards</option> : null}
                    {serviceOptions.map((option) => <option key={option.addonId} value={option.addonId}>{option.label}</option>)}
                  </select>
                </label>
              </div>}

              {isNewMemberInvite ? (
                <details className="vmb-today-command__copy-details">
                  <summary>Edit invite copy</summary>
                  <label className="vmb-today-command__field"><span>Invite title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label className="vmb-today-command__field"><span>Message</span><textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
                </details>
              ) : (
                <>
                  <label className="vmb-today-command__field"><span>Invite title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label className="vmb-today-command__field"><span>Message</span><textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
                </>
              )}

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

              <div className="vmb-today-command__send-actions">
                {isNewMemberInvite && !newMemberCopy ? (
                  <p>Publish the New Client Welcome template to this salon before sending.</p>
                ) : null}
                <button type="button" disabled={!canSend || saving} onClick={() => void (isNewMemberInvite ? sendInvite() : saveInviteStub())}>
                  {saving ? "Saving..." : isNewMemberInvite ? "Send new member invite" : "Send invite (stub)"}
                </button>
                {status ? <p>{status}</p> : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
