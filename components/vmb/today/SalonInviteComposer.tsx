"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";
import type { VmbService } from "@/lib/vmb/services/service-types";
import type { VmbServiceOption } from "@/lib/vmb/services/service-option-types";

type Props = {
  salonName: string;
  analysisId?: string;
  opportunities: TaikosOpportunity[];
};

type ReasonId =
  | "new-client"
  | "birthday"
  | "pcn"
  | "referral"
  | "reactivation"
  | "refresh"
  | "vip"
  | "open-chair"
  | "custom";

type PresetKind = "events" | "launch" | "referral";

const REASON_LABELS: Record<ReasonId, string> = {
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

const CATEGORY_TO_REASON: Partial<Record<TaikosOpportunityCategory, ReasonId>> = {
  Birthday: "birthday",
  "PCN Invite": "pcn",
  Referral: "referral",
  Reactivation: "reactivation",
  Retention: "refresh",
  "Open Slot": "open-chair",
};

function opportunityClientName(opportunity: TaikosOpportunity | undefined): string {
  if (!opportunity) return "";
  const rec = opportunity.recommendation.trim();
  const singleMatch = rec.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|has)\b/);
  if (singleMatch?.[1]) return singleMatch[1];
  const pairMatch = rec.match(/^([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/);
  if (pairMatch) return `${pairMatch[1]} & ${pairMatch[2]}`;
  return "";
}

function findOpportunity(opportunities: TaikosOpportunity[], categories: TaikosOpportunityCategory[]) {
  return opportunities.find((opportunity) => categories.includes(opportunity.category));
}

function defaultTitle(reason: ReasonId, clientName: string): string {
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

function defaultMessage(reason: ReasonId, salonName: string): string {
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

export function SalonInviteComposer({ salonName, analysisId, opportunities }: Props) {
  const [services, setServices] = useState<VmbService[]>([]);
  const [options, setOptions] = useState<VmbServiceOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState<ReasonId>("new-client");
  const [title, setTitle] = useState(defaultTitle("new-client", ""));
  const [message, setMessage] = useState(defaultMessage("new-client", salonName));
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

  const presets = useMemo(() => {
    const eventOpportunity = findOpportunity(opportunities, ["Birthday", "Reactivation", "Retention", "Open Slot"]);
    const launchOpportunity = findOpportunity(opportunities, ["PCN Invite"]);
    const referralOpportunity = findOpportunity(opportunities, ["Referral"]);
    return [
      { kind: "events" as const, label: "Events", opportunity: eventOpportunity },
      { kind: "launch" as const, label: "Launch", opportunity: launchOpportunity },
      { kind: "referral" as const, label: "Referral", opportunity: referralOpportunity },
    ];
  }, [opportunities]);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedOption = options.find((option) => option.id === selectedOptionId);
  const canSend = clientName.trim().length > 0 && title.trim().length > 0 && message.trim().length > 0;

  function applyPreset(kind: PresetKind) {
    const preset = presets.find((item) => item.kind === kind);
    const opportunity = preset?.opportunity;
    const nextReason = CATEGORY_TO_REASON[opportunity?.category ?? "PCN Invite"] ?? "pcn";
    const nextClient = opportunityClientName(opportunity);
    setReason(nextReason);
    if (nextClient) setClientName(nextClient);
    setTitle(defaultTitle(nextReason, nextClient));
    setMessage(opportunity?.recommendation || defaultMessage(nextReason, salonName));
    setStatus(null);
  }

  function selectReason(nextReason: ReasonId) {
    setReason(nextReason);
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
            inviteCategory: reason,
            templateType: REASON_LABELS[reason],
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
      <div className="vmb-today-invite-composer__head">
        <p className="vmb-today-invite-composer__kicker">Instant conversion link</p>
        <h2>New Client Offer</h2>
        <p>Create a claim-ready invite for a client in seconds.</p>
      </div>

      <div className="vmb-today-invite-composer__instant">
        <button
          type="button"
          className="vmb-today-invite-composer__primary"
          onClick={() => {
            selectReason("new-client");
            setOfferPreviewOpen(true);
          }}
        >
          New Client Offer
        </button>
        <p>Opens the complete offer preview before saving the internal invite.</p>
      </div>

      <label className="vmb-today-invite-composer__field">
        <span>Choose offer</span>
        <select value={reason} onChange={(event) => selectReason(event.target.value as ReasonId)}>
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="vmb-today-invite-composer__presets" aria-label="TAIKOS priority fill">
        {presets.map((preset) => (
          <button key={preset.kind} type="button" onClick={() => applyPreset(preset.kind)}>
            <strong>{preset.label}</strong>
            <span>{preset.opportunity ? preset.opportunity.title : "No priority found"}</span>
          </button>
        ))}
      </div>

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
                <p>{REASON_LABELS[reason]}</p>
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
