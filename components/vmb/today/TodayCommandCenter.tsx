"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VmbService } from "@/lib/vmb/services/service-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";
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
  clientEmailPrefill,
  clientPhonePrefill,
  onSelectOpportunity,
}: Props) {
  const [services, setServices] = useState<VmbService[]>([]);
  const [options, setOptions] = useState<VmbServiceOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState(defaultInviteTitle(selectedReason, ""));
  const [message, setMessage] = useState(defaultInviteMessage(selectedReason, salonName));
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/vmb/services", { cache: "no-store", credentials: "include" });
        const json = (await response.json()) as { ok?: boolean; services?: VmbService[]; options?: VmbServiceOption[] };
        if (!cancelled && response.ok && json.ok) {
          const activeServices = (json.services ?? []).filter((service) => service.active !== false);
          const activeOptions = (json.options ?? []).filter((option) => option.active !== false);
          setServices(activeServices);
          setOptions(activeOptions);
          setSelectedServiceId((current) => current || activeServices[0]?.id || "");
          setSelectedOptionId((current) => current || activeOptions[0]?.id || "");
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setOptions([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedOpportunity) {
      setClientName("");
      setTitle(defaultInviteTitle(selectedReason, ""));
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
  }, [salonName, selectedOpportunity, selectedReason]);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedOption = options.find((option) => option.id === selectedOptionId);
  const canSend = Boolean(selectedOpportunity && clientName.trim() && title.trim() && message.trim());

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
            selectedService: selectedService?.name ?? "",
            selectedReward: selectedOption?.name ?? "",
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

  return (
    <section className="vmb-today-command" aria-label="Client selection and invite review workspace">
      <div className="vmb-today-command__head">
        <p className="vmb-today-command__kicker">Action items</p>
        <h2 className="vmb-today-command__title">{SALON_INVITE_REASON_LABELS[selectedReason]}</h2>
        <p className="vmb-today-command__lead">
          Choose a matching client, review the invite, then send.
        </p>
      </div>

      <div className="vmb-today-command__sequence">
        <section className="vmb-today-command__matches" aria-label="Matching clients">
          <div className="vmb-today-command__section-head">
            <div>
              <span>Step A</span>
              <h3>Matching clients</h3>
            </div>
            <strong>{selectedOfferRecommendations.length}</strong>
          </div>
          {selectedOfferRecommendations.length > 0 ? (
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
          <Link href={snapshot.primaryCtaHref} className="vmb-today-command__library-link">Open invite library</Link>
        </section>

        <section className="vmb-today-command__review" aria-label="Selected client invite review">
          <div className="vmb-today-command__section-head">
            <div>
              <span>Step B</span>
              <h3>Review and send</h3>
            </div>
          </div>

          {!selectedOpportunity ? (
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
                <strong>{selectedOpportunity.clientName}</strong>
                <p>{selectedOpportunity.reason}</p>
              </div>

              <div className="vmb-today-command__contact-grid">
                <label><span>Client name</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
                <label><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label><span>Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              </div>

              <div className="vmb-today-command__contact-grid">
                <label>
                  <span>Active service</span>
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {services.length === 0 ? <option value="">No active services</option> : null}
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Reward / option</span>
                  <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
                    {options.length === 0 ? <option value="">No active rewards</option> : null}
                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>
              </div>

              <label className="vmb-today-command__field"><span>Invite title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className="vmb-today-command__field"><span>Message</span><textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>

              <div className="vmb-today-command__invite-preview">
                <span>{contactSummary(email, phone)}</span>
                <strong>{title}</strong>
                <p>{message}</p>
                <small>{selectedService?.name || "Service"} · {selectedOption?.name || "Reward"}</small>
              </div>

              <div className="vmb-today-command__send-actions">
                <button type="button" disabled={!canSend || saving} onClick={() => void saveInviteStub()}>
                  {saving ? "Saving..." : "Send invite (stub)"}
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
