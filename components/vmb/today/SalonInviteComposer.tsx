"use client";

import type { TaikosOpportunity, TaikosOpportunityCategory } from "@/lib/taikos/opportunities/types";

type Props = {
  selectedReason: SalonInviteReasonId;
  clientSearch: string;
  matchingCount: number;
  onSelectedReasonChange: (reason: SalonInviteReasonId) => void;
  onClientSearchChange: (value: string) => void;
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

export type InviteClientCandidate = {
  id: string;
  clientName: string;
  reason: string;
  suggestedMessage: string;
  estimatedValue: number;
  reasonId: SalonInviteReasonId;
};

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

export function defaultInviteTitle(reason: SalonInviteReasonId, clientName: string): string {
  const who = clientName.trim() || "your client";
  switch (reason) {
    case "new-client": return `New client offer for ${who}`;
    case "birthday": return `A birthday nail treat for ${who}`;
    case "pcn": return `Private client invite for ${who}`;
    case "referral": return `A referral thank-you for ${who}`;
    case "reactivation": return `We miss you, ${who}`;
    case "refresh": return `Refresh reminder for ${who}`;
    case "vip": return `A VIP thank-you for ${who}`;
    case "open-chair": return `Opening available for ${who}`;
    default: return `Invite for ${who}`;
  }
}

export function defaultInviteMessage(reason: SalonInviteReasonId, salonName: string): string {
  switch (reason) {
    case "new-client": return `I put together a new client offer from ${salonName} so your first visit is easy to book.`;
    case "birthday": return `I put together a birthday-ready nail offer from ${salonName}.`;
    case "pcn": return "I would like to invite you into my private client list for early openings, client-only offers, and little surprises.";
    case "referral": return "Thank you for sending good people my way. I put together a small referral thank-you.";
    case "reactivation": return "It has been a little while, and I would love to see you back in the chair.";
    case "refresh": return "You may be due for a refresh, so I saved an easy way to book your next set.";
    case "vip": return "I appreciate you and wanted to send a little client-only thank-you.";
    case "open-chair": return "I have an opening and thought of you first.";
    default: return `I put together an invite from ${salonName}.`;
  }
}

export function SalonInviteComposer({
  selectedReason,
  clientSearch,
  matchingCount,
  onSelectedReasonChange,
  onClientSearchChange,
}: Props) {
  return (
    <aside className="vmb-today-invite-composer" aria-label="Touch point and client search">
      <label className="vmb-today-invite-composer__field">
        <span>1. Touch point</span>
        <select
          value={selectedReason}
          onChange={(event) => onSelectedReasonChange(event.target.value as SalonInviteReasonId)}
        >
          {Object.entries(SALON_INVITE_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="vmb-today-invite-composer__field">
        <span>2. Find a client</span>
        <input
          type="search"
          value={clientSearch}
          onChange={(event) => onClientSearchChange(event.target.value)}
          placeholder="Search name, phone, or email"
        />
      </label>

      <p className="vmb-today-invite-composer__search-note">
        {matchingCount === 1 ? "1 matching TAIKOS client" : `${matchingCount} matching TAIKOS clients`} shown below.
      </p>
    </aside>
  );
}
