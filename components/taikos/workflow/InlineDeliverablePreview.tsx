"use client";

import type { TaikosDeliverable } from "@/lib/taikos/deliverables/types";

type Props = {
  deliverable: TaikosDeliverable;
};

function inviteVariant(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("referral")) return "Referral Invite";
  if (lower.includes("vip")) return "VIP Invite";
  if (lower.includes("birthday")) return "Birthday Invite";
  if (lower.includes("founding")) return "Founding Member Invite";
  if (lower.includes("reactivat")) return "Reactivation Invite";
  if (lower.includes("campaign") || lower.includes("slot")) return "Campaign Invite";
  return "Private Client Network";
}

type InviteFrame = {
  badge: string;
  title: string;
  audience: string;
  clients: string[];
  message: string;
  value?: number;
};

type ServiceFrame = {
  serviceName: string;
  description: string;
  priceDisplay?: string;
  callToAction: string;
};

function toInviteFrame(deliverable: TaikosDeliverable): InviteFrame {
  if (deliverable.type === "invite") {
    return {
      badge: inviteVariant(deliverable.title),
      title: deliverable.title,
      audience: deliverable.audience,
      clients: deliverable.suggestedClients,
      message: deliverable.message,
      value: deliverable.estimatedValue,
    };
  }

  if (deliverable.type === "referral_ask") {
    return {
      badge: "Referral Invite",
      title: `Ask ${deliverable.referrer} for a referral`,
      audience: "Top referrer",
      clients: [deliverable.referrer],
      message: deliverable.message,
    };
  }

  if (deliverable.type === "reactivation") {
    return {
      badge: "Reactivation Invite",
      title: `Welcome back, ${deliverable.client}`,
      audience: deliverable.reason,
      clients: [deliverable.client],
      message: deliverable.message,
      value: deliverable.estimatedValue,
    };
  }

  if (deliverable.type === "campaign") {
    return {
      badge: inviteVariant(deliverable.title),
      title: deliverable.title,
      audience: deliverable.audience,
      clients: [],
      message: deliverable.message,
      value: deliverable.estimatedValue,
    };
  }

  if (deliverable.type === "calendar_gap") {
    return {
      badge: "Open Slot Invite",
      title: deliverable.title || "Fill open appointment",
      audience: deliverable.slots.join(" · "),
      clients: deliverable.likelyClients.slice(0, 3),
      message: deliverable.message,
    };
  }

  if (deliverable.type === "client_segment") {
    return {
      badge: "Client Invite",
      title: deliverable.title,
      audience: deliverable.segment,
      clients: deliverable.clientNames.slice(0, 3),
      message: `${deliverable.count} clients in this segment.`,
    };
  }

  return {
    badge: "Invite Card",
    title: deliverable.title,
    audience: "Your salon clients",
    clients: [],
    message: "Placeholder invite preview — final copy on send.",
  };
}

function toServiceFrame(deliverable: TaikosDeliverable): ServiceFrame {
  if (deliverable.type === "service_card") {
    return {
      serviceName: deliverable.serviceName,
      description: deliverable.description,
      priceDisplay: deliverable.priceDisplay,
      callToAction: deliverable.callToAction,
    };
  }

  if (deliverable.type === "campaign") {
    return {
      serviceName: deliverable.title,
      description: deliverable.objective,
      callToAction: deliverable.message,
    };
  }

  if (deliverable.type === "calendar_gap") {
    return {
      serviceName: "Open Slot Offer",
      description: deliverable.slots.join(" · "),
      callToAction: deliverable.message,
    };
  }

  return {
    serviceName: deliverable.title,
    description: "Service card preview — placeholder marketing frame.",
    callToAction: "Book now",
  };
}

function useInviteFrame(deliverable: TaikosDeliverable): boolean {
  return (
    deliverable.type === "invite" ||
    deliverable.type === "referral_ask" ||
    deliverable.type === "reactivation" ||
    deliverable.type === "client_segment" ||
    deliverable.type === "calendar_gap"
  );
}

function InviteCardPreview({ frame }: { frame: InviteFrame }) {
  return (
    <article className="taikos-marketing-card taikos-marketing-card--invite">
      <div className="taikos-marketing-card__visual taikos-marketing-card__visual--invite" aria-hidden>
        <span className="taikos-marketing-card__badge">{frame.badge}</span>
      </div>
      <div className="taikos-marketing-card__body">
        <h4 className="taikos-marketing-card__title">{frame.title}</h4>
        <p className="taikos-marketing-card__meta">{frame.audience}</p>
        {frame.clients.length > 0 ? (
          <p className="taikos-marketing-card__meta">{frame.clients.slice(0, 3).join(" · ")}</p>
        ) : null}
        <p className="taikos-marketing-card__message">{frame.message}</p>
        {frame.value && frame.value > 0 ? (
          <p className="taikos-marketing-card__price">+${frame.value.toLocaleString()}</p>
        ) : null}
      </div>
    </article>
  );
}

function ServiceCardPreview({ frame }: { frame: ServiceFrame }) {
  return (
    <article className="taikos-marketing-card taikos-marketing-card--service">
      <div className="taikos-marketing-card__visual" aria-hidden>
        <span className="taikos-marketing-card__badge">Service Card</span>
      </div>
      <div className="taikos-marketing-card__body">
        <h4 className="taikos-marketing-card__title">{frame.serviceName}</h4>
        <p className="taikos-marketing-card__desc">{frame.description}</p>
        {frame.priceDisplay ? <p className="taikos-marketing-card__price">{frame.priceDisplay}</p> : null}
        <p className="taikos-marketing-card__cta">{frame.callToAction}</p>
      </div>
    </article>
  );
}

export function InlineDeliverablePreview({ deliverable }: Props) {
  if (useInviteFrame(deliverable)) {
    return <InviteCardPreview frame={toInviteFrame(deliverable)} />;
  }
  return <ServiceCardPreview frame={toServiceFrame(deliverable)} />;
}
