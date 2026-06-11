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
  return "Private Client Network";
}

export function InlineDeliverablePreview({ deliverable }: Props) {
  if (deliverable.type === "service_card") {
    return (
      <article className="taikos-marketing-card taikos-marketing-card--service">
        <div className="taikos-marketing-card__visual" aria-hidden>
          <span className="taikos-marketing-card__badge">Service Card</span>
        </div>
        <div className="taikos-marketing-card__body">
          <h4 className="taikos-marketing-card__title">{deliverable.serviceName}</h4>
          <p className="taikos-marketing-card__desc">{deliverable.description}</p>
          {deliverable.priceDisplay ? (
            <p className="taikos-marketing-card__price">{deliverable.priceDisplay}</p>
          ) : null}
          <p className="taikos-marketing-card__cta">{deliverable.callToAction}</p>
        </div>
      </article>
    );
  }

  if (deliverable.type === "invite") {
    return (
      <article className="taikos-marketing-card taikos-marketing-card--invite">
        <div className="taikos-marketing-card__visual taikos-marketing-card__visual--invite" aria-hidden>
          <span className="taikos-marketing-card__badge">{inviteVariant(deliverable.title)}</span>
        </div>
        <div className="taikos-marketing-card__body">
          <h4 className="taikos-marketing-card__title">{deliverable.title}</h4>
          <p className="taikos-marketing-card__meta">{deliverable.audience}</p>
          {deliverable.suggestedClients.length > 0 ? (
            <p className="taikos-marketing-card__meta">
              {deliverable.suggestedClients.slice(0, 3).join(" · ")}
            </p>
          ) : null}
          <p className="taikos-marketing-card__message">{deliverable.message}</p>
          {deliverable.estimatedValue > 0 ? (
            <p className="taikos-marketing-card__price">+${deliverable.estimatedValue.toLocaleString()}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (deliverable.type === "referral_ask") {
    return (
      <article className="taikos-marketing-card taikos-marketing-card--referral">
        <h4 className="taikos-marketing-card__title">Ask {deliverable.referrer} for a referral</h4>
        <p className="taikos-marketing-card__message">{deliverable.message}</p>
        <p className="taikos-marketing-card__meta">Reward: {deliverable.rewardSuggestion}</p>
      </article>
    );
  }

  if (deliverable.type === "reactivation") {
    return (
      <article className="taikos-marketing-card taikos-marketing-card--reactivation">
        <h4 className="taikos-marketing-card__title">Reactivate {deliverable.client}</h4>
        <p className="taikos-marketing-card__meta">{deliverable.reason}</p>
        <p className="taikos-marketing-card__message">{deliverable.message}</p>
      </article>
    );
  }

  if (deliverable.type === "campaign" || deliverable.type === "calendar_gap") {
    const title = deliverable.type === "calendar_gap" ? "Open Slot Campaign" : deliverable.title;
    const message =
      deliverable.type === "calendar_gap"
        ? deliverable.message
        : deliverable.message;
    return (
      <article className="taikos-marketing-card taikos-marketing-card--campaign">
        <h4 className="taikos-marketing-card__title">{title}</h4>
        {deliverable.type === "calendar_gap" ? (
          <p className="taikos-marketing-card__meta">{deliverable.slots.join(" · ")}</p>
        ) : (
          <>
            <p className="taikos-marketing-card__meta">{deliverable.objective}</p>
            <p className="taikos-marketing-card__meta">{deliverable.audience}</p>
          </>
        )}
        <p className="taikos-marketing-card__message">{message}</p>
      </article>
    );
  }

  return (
    <article className="taikos-marketing-card">
      <h4 className="taikos-marketing-card__title">{deliverable.title}</h4>
    </article>
  );
}
