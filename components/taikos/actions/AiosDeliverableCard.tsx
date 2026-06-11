"use client";

import type { TaikosDeliverable } from "@/lib/taikos/deliverables/types";

type Props = {
  deliverable: TaikosDeliverable;
};

export function AiosDeliverableCard({ deliverable }: Props) {
  return (
    <article className="aios-deliverable">
      <header className="aios-deliverable__head">
        <p className="aios-deliverable__type">{deliverable.type.replace(/_/g, " ")}</p>
        <h3 className="aios-deliverable__title">{deliverable.title}</h3>
      </header>

      {deliverable.type === "invite" ? (
        <>
          <p className="aios-deliverable__label">Audience</p>
          <p className="aios-deliverable__value">{deliverable.audience}</p>
          {deliverable.suggestedClients.length > 0 ? (
            <p className="aios-deliverable__meta">
              {deliverable.suggestedClients.slice(0, 4).join(" · ")}
            </p>
          ) : null}
          <p className="aios-deliverable__label">Message</p>
          <p className="aios-deliverable__message">{deliverable.message}</p>
          {deliverable.estimatedValue > 0 ? (
            <p className="aios-deliverable__value-tag">
              +${deliverable.estimatedValue.toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}

      {deliverable.type === "service_card" ? (
        <>
          <p className="aios-deliverable__label">Service</p>
          <p className="aios-deliverable__value">{deliverable.serviceName}</p>
          <p className="aios-deliverable__message">{deliverable.description}</p>
          {deliverable.priceDisplay ? (
            <p className="aios-deliverable__meta">{deliverable.priceDisplay}</p>
          ) : null}
          {deliverable.visualPrompt ? (
            <p className="aios-deliverable__meta">Visual: {deliverable.visualPrompt}</p>
          ) : null}
          <p className="aios-deliverable__cta">{deliverable.callToAction}</p>
        </>
      ) : null}

      {deliverable.type === "campaign" ? (
        <>
          <p className="aios-deliverable__label">Objective</p>
          <p className="aios-deliverable__value">{deliverable.objective}</p>
          <p className="aios-deliverable__label">Audience</p>
          <p className="aios-deliverable__value">{deliverable.audience}</p>
          <p className="aios-deliverable__message">{deliverable.message}</p>
          <p className="aios-deliverable__meta">Send window: {deliverable.recommendedSendWindow}</p>
          {deliverable.estimatedValue > 0 ? (
            <p className="aios-deliverable__value-tag">
              +${deliverable.estimatedValue.toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}

      {deliverable.type === "referral_ask" ? (
        <>
          <p className="aios-deliverable__label">Referrer</p>
          <p className="aios-deliverable__value">{deliverable.referrer}</p>
          <p className="aios-deliverable__message">{deliverable.message}</p>
          <p className="aios-deliverable__meta">Reward: {deliverable.rewardSuggestion}</p>
        </>
      ) : null}

      {deliverable.type === "reactivation" ? (
        <>
          <p className="aios-deliverable__label">Client</p>
          <p className="aios-deliverable__value">{deliverable.client}</p>
          <p className="aios-deliverable__meta">{deliverable.reason}</p>
          <p className="aios-deliverable__message">{deliverable.message}</p>
          {deliverable.estimatedValue > 0 ? (
            <p className="aios-deliverable__value-tag">
              +${deliverable.estimatedValue.toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}

      {deliverable.type === "client_segment" ? (
        <>
          <p className="aios-deliverable__label">Segment</p>
          <p className="aios-deliverable__value">{deliverable.segment}</p>
          <p className="aios-deliverable__meta">{deliverable.count} clients</p>
          {deliverable.clientNames.length > 0 ? (
            <p className="aios-deliverable__meta">
              {deliverable.clientNames.slice(0, 5).join(" · ")}
            </p>
          ) : null}
        </>
      ) : null}

      {deliverable.type === "calendar_gap" ? (
        <>
          <p className="aios-deliverable__label">Open slots</p>
          <p className="aios-deliverable__value">{deliverable.slots.join(" · ")}</p>
          {deliverable.likelyClients.length > 0 ? (
            <>
              <p className="aios-deliverable__label">Likely fills</p>
              <p className="aios-deliverable__meta">
                {deliverable.likelyClients.slice(0, 4).join(" · ")}
              </p>
            </>
          ) : null}
          <p className="aios-deliverable__message">{deliverable.message}</p>
        </>
      ) : null}
    </article>
  );
}
