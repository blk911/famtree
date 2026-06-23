"use client";



import { SalonInvitationThumbnail } from "@/components/vmb/salon/SalonInvitationThumbnail";

import { formatInvitationPrice } from "@/lib/vmb/invites/invitation-package-pricing";

import type { InviteTemplateSnapshot } from "@/lib/vmb/invites/invite-template-snapshot";

import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

import type { SuggestedInvitationRecommendation } from "@/lib/vmb/invites/suggested-invitation-workflow";



type Props = {

  recommendation: SuggestedInvitationRecommendation;

  previewSnapshot: InviteTemplateSnapshot | null;

  tokenContext?: InviteTemplateTokenContext;

  onPreview: () => void;

  onApprove: () => void;

  onPause: () => void;

  busy?: boolean;

  approveSuccess?: boolean;

};



const APPROVE_DISABLED_HINT = "Publish this invitation from Admin Library before approving.";

function displayTouchPointName(name: string): string {
  return name === "Private Client Network" ? "Private Client Invite" : name;
}



export function SuggestedInvitationCard({

  recommendation,

  previewSnapshot,

  tokenContext,

  onPreview,

  onApprove,

  onPause,

  busy = false,

  approveSuccess = false,

}: Props) {

  const hasPublishedTemplate = Boolean(recommendation.publishedCopy);

  const canApprove = hasPublishedTemplate && !approveSuccess;
  const templateName = displayTouchPointName(recommendation.templateName);



  return (

    <details className="vmb-suggested-invite-card">

      <summary className="vmb-suggested-invite-card__summary">

        <div className="vmb-suggested-invite-card__client">

          <div className="vmb-suggested-invite-card__client-head">

            <p className="vmb-suggested-invite-card__category">{recommendation.categoryLabel}</p>

            {!hasPublishedTemplate ? (

              <span className="vmb-suggested-invite-card__badge">Needs published template</span>

            ) : (

              <span className="vmb-suggested-invite-card__badge vmb-suggested-invite-card__badge--ready">

                Published v{recommendation.publishedCopy!.publishedVersion}

              </span>

            )}

          </div>

          <h2 className="vmb-suggested-invite-card__client-name">{recommendation.clientName}</h2>

          <p className="vmb-suggested-invite-card__reason">{recommendation.reasonHeadline}</p>

        </div>

        <div className="vmb-suggested-invite-card__compact-lines">
          <span>{templateName}</span>
          {recommendation.services.length > 0 ? <span>{recommendation.services.slice(0, 2).join(", ")}</span> : null}
          {recommendation.pricing ? (
            <span>{recommendation.pricing.priceLabel} offer</span>
          ) : (
            <span>${recommendation.estimatedValue.toLocaleString()} value</span>
          )}
        </div>

        <div className="vmb-suggested-invite-card__summary-actions">
          <button
            type="button"
            className="vmb-suggested-invite-card__action"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onPreview();
            }}
          >
            Preview
          </button>
          <span className="vmb-suggested-invite-card__approve-wrap" title={!canApprove ? APPROVE_DISABLED_HINT : undefined}>
            <button
              type="button"
              className="vmb-suggested-invite-card__action vmb-suggested-invite-card__action--primary"
              disabled={busy || !canApprove}
              aria-describedby={!canApprove ? `approve-hint-${recommendation.id}` : undefined}
              onClick={(event) => {
                event.preventDefault();
                onApprove();
              }}
            >
              Approve
            </button>
          </span>
          <button
            type="button"
            className="vmb-suggested-invite-card__action"
            disabled={busy || approveSuccess}
            onClick={(event) => {
              event.preventDefault();
              onPause();
            }}
          >
            Pause
          </button>
        </div>

      </summary>

      <div className="vmb-suggested-invite-card__body">



        <dl className="vmb-suggested-invite-card__details">

          <DetailRow label="Suggested Invitation" value={templateName} />

          {recommendation.services.length > 0 ? (

            <DetailRow label="Services" value={recommendation.services.join(", ")} />

          ) : null}

          {recommendation.rewards.length > 0 ? (

            <DetailRow label="Level up with" value={recommendation.rewards.join(", ")} />

          ) : null}

          {recommendation.expirationLabel ? (

            <DetailRow label="Expiration" value={recommendation.expirationLabel} />

          ) : null}

          {recommendation.pricing ? (

            <>

              <DetailRow label="Value" value={recommendation.pricing.valueLabel} />

              {recommendation.pricing.savingsAmount > 0 ? (

                <DetailRow

                  label="Savings"

                  value={formatInvitationPrice(recommendation.pricing.savingsAmount)}

                />

              ) : null}

              <DetailRow label="Offer" value={recommendation.pricing.priceLabel} />

            </>

          ) : (

            <DetailRow

              label="Estimated Value"

              value={`$${recommendation.estimatedValue.toLocaleString()}`}

            />

          )}

        </dl>



        <div className="vmb-suggested-invite-card__preview">

          {previewSnapshot ? (

            <SalonInvitationThumbnail snapshot={previewSnapshot} tokenContext={tokenContext} compact />

          ) : (

            <div className="vmb-suggested-invite-card__thumb-placeholder">

              Template not published yet

            </div>

          )}

        </div>

      </div>



      {approveSuccess ? (

        <p className="vmb-suggested-invite-card__success">Approved. Ready to send later.</p>

      ) : null}



      <footer className="vmb-suggested-invite-card__footer">

        {!canApprove && !approveSuccess ? (

          <p id={`approve-hint-${recommendation.id}`} className="vmb-suggested-invite-card__approve-hint">

            {APPROVE_DISABLED_HINT}

          </p>

        ) : null}

      </footer>

    </details>

  );

}



function DetailRow({ label, value }: { label: string; value: string }) {

  return (

    <div className="vmb-suggested-invite-card__detail-row">

      <dt>{label}</dt>

      <dd>{value}</dd>

    </div>

  );

}

