"use client";

import { useEffect, useState } from "react";
import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";
import type { VmbService } from "@/lib/vmb/services/service-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";

type Props = {
  salonName: string;
  analysisId?: string;
  selectedReason: SalonInviteReasonId;
  offerRecommendations?: TaikosOpportunity[];
  prefillOpportunity?: TaikosOpportunity | null;
  prefillKey?: number;
  newClientLaunchSignal?: number;
  onSelectedReasonChange: (reason: SalonInviteReasonId) => void;
  onUseOfferOpportunity?: (opportunity: TaikosOpportunity) => void;
};

export type SalonInviteReasonId =
  | "new-client"
  | "birthday"
  | "pcn"
  | "referral"
  | "reactivation"
  | "refresh"
  | "vip"
  | "open-chair"
  | "custom";

export const SALON_INVITE_REASON_LABELS: Record<SalonInviteReasonId, string> = {
  "new-client": "New Client Offer",
  birthday: "Birthday / Event",
  pcn: "Private Client Invite",
  referral: "Referral Invite",
  reactivation: "We Miss You",
  refresh: "Refresh Reminder",
  vip: "VIP Thank You",
  "open-chair": "Open Chair",
  custom: "Custom",
};

const CATEGORY_TO_REASON: Partial<Record<TaikosOpportunityCategory, SalonInviteReasonId>> = {
  Birthday: "birthday",
  "PCN Invite": "pcn",
  Referral: "referral",
  Reactivation: "reactivation",
  Retention: "refresh",
  "Open Slot": "open-chair",
};

export function salonInviteReasonForOpportunity(
  opportunity: TaikosOpportunity,
): SalonInviteReasonId | null {
  return CATEGORY_TO_REASON[opportunity.category] ?? null;
}

export function clientNameFromInviteOpportunity(opportunity: TaikosOpportunity | undefined): string {
  if (!opportunity) return "";
  const rec = opportunity.recommendation.trim();
  const singleMatch = rec.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|has)\b/);
  if (singleMatch?.[1]) return singleMatch[1];
  const pairMatch = rec.match(/^([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/);
  if (pairMatch) return `${pairMatch[1]} & ${pairMatch[2]}`;
  return "";
}

export function inviteOpportunityClientLabel(opportunity: TaikosOpportunity): string {
  return clientNameFromInviteOpportunity(opportunity) || opportunity.title;
}

function defaultTitle(reason: SalonInviteReasonId, clientName: string): string {
  const who = clientName.trim() || "your client";
  switch (reason) {
    case "new-client":
      return `New client offer for ${who}`;
    case "birthday":
      return `A birthday nail treat for ${who}`;
    case "pcn":
      return `Private client invite for ${who}`;
    case "referral":
      return `A referral thank-you for ${who}`;
    case "reactivation":
      return `We miss you, ${who}`;
    case "refresh":
      return `Refresh reminder for ${who}`;
    case "vip":
      return `A VIP thank-you for ${who}`;
    case "open-chair":
      return `Opening available for ${who}`;
    default:
      return `Invite for ${who}`;
  }
}

function defaultMessage(reason: SalonInviteReasonId, salonName: string): string {
  switch (reason) {
    case "new-client":
      return `I put together a new client offer from ${salonName} so your first visit is easy to book.`;
    case "birthday":
      return `I put together a birthday-ready nail offer from ${salonName}.`;
    case "pcn":
      return `I would like to invite you into my private client list for early openings, client-only offers, and little surprises.`;
    case "referral":
      return `Thank you for sending good people my way. I put together a small referral thank-you.`;
    case "reactivation":
      return `It has been a little while, and I would love to see you back in the chair.`;
    case "refresh":
      return `You may be due for a refresh, so I saved an easy way to book your next set.`;
    case "vip":
      return `I appreciate you and wanted to send a little client-only thank-you.`;
    case "open-chair":
      return `I have an opening and thought of you first.`;
    default:
      return `I put together an invite from ${salonName}.`;
  }
}

function contactSummary(email: string, phone: string): string {
  const parts = [email.trim(), phone.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "No contact yet";
}

export function SalonInviteComposer({
  salonName,
  analysisId,
  selectedReason,
  prefillOpportunity,
  prefillKey,
  newClientLaunchSignal,
  onSelectedReasonChange,
}: Props) {
  const [services, setServices] = useState<VmbService[]>([]);
  const [options, setOptions] = useState<VmbServiceOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState(defaultTitle(selectedReason, ""));
  const [message, setMessage] = useState(defaultMessage(selectedReason, salonName));
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [offerPreviewOpen, setOfferPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const res = await fetch("/api/vmb/services", { cache: "no-store", credentials: "include" });
        const json = (await res.json()) as {
          ok?: boolean;
          services?: VmbService[];
          options?: VmbServiceOption[];
        };
        if (!cancelled && res.ok && json.ok) {
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
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefillOpportunity) return;
    const nextReason = salonInviteReasonForOpportunity(prefillOpportunity);
    const nextClient = clientNameFromInviteOpportunity(prefillOpportunity);
    if (nextReason) {
      onSelectedReasonChange(nextReason);
    }
    if (nextClient) {
      setClientName(nextClient);
    }
    setTitle(defaultTitle(nextReason ?? selectedReason, nextClient));
    setMessage(prefillOpportunity.recommendation || defaultMessage(nextReason ?? selectedReason, salonName));
    setStatus(null);
  }, [prefillKey]);

  useEffect(() => {
    if (!newClientLaunchSignal) return;
    selectReason("new-client");
    setOfferPreviewOpen(true);
  }, [newClientLaunchSignal]);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedOption = options.find((option) => option.id === selectedOptionId);
  const canSend = clientName.trim().length > 0 && title.trim().length > 0 && message.trim().length > 0;

  function selectReason(nextReason: SalonInviteReasonId) {
    onSelectedReasonChange(nextReason);
    setTitle(defaultTitle(nextReason, clientName));
    setMessage(defaultMessage(nextReason, salonName));
    setStatus(null);
  }

  async function handleStubSend() {
    if (!canSend) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/vmb/invite-events", {
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
            sourcePage: "vmb-today-salon-invite-composer",
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
      const json = (await res.json()) as { ok?: boolean; eventId?: string; error?: string };
      if (!res.ok || !json.ok) {
        setStatus(json.error ?? "Could not save invite stub.");
        return;
      }
      setStatus("Invite stub saved internally. Delivery is not live yet.");
      setOfferPreviewOpen(false);
    } catch {
      setStatus("Could not save invite stub.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="vmb-today-invite-composer" aria-label="Salon invite composer">
      <label className="vmb-today-invite-composer__field">
        <span>Touch point</span>
        <select value={selectedReason} onChange={(event) => selectReason(event.target.value as SalonInviteReasonId)}>
          {Object.entries(SALON_INVITE_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="vmb-today-invite-composer__grid vmb-today-invite-composer__grid--contact">
        <label>
          <span>Client name</span>
          <input value={clientName} onChange={(event) => setClientName(event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>Phone</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
      </div>

      <button
        type="button"
        className="vmb-today-invite-composer__ghost vmb-today-invite-composer__preview-launch"
        onClick={() => setOfferPreviewOpen(true)}
      >
        Preview selected offer
      </button>

      <details className="vmb-today-invite-composer__message-drawer">
        <summary>Edit reason and message</summary>
        <label className="vmb-today-invite-composer__field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="vmb-today-invite-composer__field">
          <span>Message</span>
          <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
      </details>
      {status ? <p className="vmb-today-invite-composer__status">{status}</p> : null}

      {offerPreviewOpen ? (
        <div className="vmb-today-offer-modal" role="dialog" aria-modal="true" aria-label="Offer preview">
          <div className="vmb-today-offer-modal__panel">
            <div className="vmb-today-offer-modal__head">
              <div>
                <p>{SALON_INVITE_REASON_LABELS[selectedReason]}</p>
                <h3>{title || "Invite title"}</h3>
              </div>
              <button type="button" onClick={() => setOfferPreviewOpen(false)}>
                Close
              </button>
            </div>

            <div className="vmb-today-invite-composer__feature vmb-today-invite-composer__feature--modal">
              <div className="vmb-today-invite-composer__options">
                <label>
                  <span>Active service</span>
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {services.length === 0 ? <option value="">No active services</option> : null}
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Reward / option</span>
                  <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
                    {options.length === 0 ? <option value="">No active rewards</option> : null}
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="vmb-today-invite-composer__preview">
                <p>{contactSummary(email, phone)}</p>
                <strong>{clientName || "Client name needed"}</strong>
                <span>{message}</span>
                <span>{selectedService?.name || "Service"} · {selectedOption?.name || "Reward"}</span>
              </div>

              <div className="vmb-today-invite-composer__actions">
                <button type="button" className="vmb-today-invite-composer__ghost">
                  Preview invite
                </button>
                <button type="button" disabled={!canSend || saving} onClick={() => void handleStubSend()}>
                  {saving ? "Saving..." : "Send (stub)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
