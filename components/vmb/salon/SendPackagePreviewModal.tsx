"use client";

import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import { ViewSalonPageLink } from "@/components/vmb/salon/ViewSalonPageLink";
import { resolveInvitationPricing } from "@/lib/vmb/invites/invitation-pricing-display";
import { formatInvitationPrice } from "@/lib/vmb/invites/invitation-package-pricing";
import {
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
  snapshotToSalonInviteCardProps,
} from "@/lib/vmb/invites/invite-template-snapshot";
import { buildSendPackageCopy } from "@/lib/vmb/invites/send-package-copy";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { SalonInvitationApproval } from "@/types/vmb/salon-invitation-approval";

type Props = {
  open: boolean;
  approval: SalonInvitationApproval;
  tokenContext: InviteTemplateTokenContext;
  salonName: string;
  onClose: () => void;
};

export function SendPackagePreviewModal({
  open,
  approval,
  tokenContext,
  salonName,
  onClose,
}: Props) {
  if (!open) return null;

  const copy = buildSendPackageCopy(approval);
  const pricing = resolveInvitationPricing(approval.snapshot);
  const services = resolveSnapshotServiceLabels(approval.snapshot);
  const rewards = resolveSnapshotRewardLabels(approval.snapshot);
  const cardProps = snapshotToSalonInviteCardProps(approval.snapshot, { tokenContext });

  const ownerFirst = approval.snapshot.ownerName?.trim().split(/\s+/)[0];
  const landingTitle = ownerFirst ? `${ownerFirst}'s Salon Page` : `${salonName} Salon Page`;

  return (
    <div
      className="vmb-send-package-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vmb-send-package-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-package-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vmb-send-package-modal__header">
          <h2 id="send-package-preview-title">Send Package Preview</h2>
          <p className="vmb-send-package-modal__subtitle">
            Preview what {approval.clientName} will receive — no email is sent yet.
          </p>
        </header>

        <div className="vmb-send-package-modal__body">
          <div className="vmb-send-package-modal__columns">
            <section className="vmb-send-package-modal__summary" aria-label="Client summary">
              <h3 className="vmb-send-package-modal__column-title">Client / Opportunity Summary</h3>
              <dl className="vmb-send-package-modal__summary-list">
                <SummaryRow label="Client" value={approval.clientName} />
                <SummaryRow label="Opportunity type" value={approval.opportunityType} />
                <SummaryRow label="Reason" value={approval.reasonText} />
                {services.length > 0 ? (
                  <SummaryRow label="Service" value={services.join(" · ")} />
                ) : null}
                {rewards.length > 0 ? (
                  <SummaryRow label="Rewards" value={rewards.join(" · ")} />
                ) : null}
                <SummaryRow label="Value" value={pricing.valueLabel} />
                {pricing.savingsAmount > 0 ? (
                  <SummaryRow label="Savings" value={formatInvitationPrice(pricing.savingsAmount)} />
                ) : null}
                <SummaryRow label="Offer" value={pricing.priceLabel} />
                {approval.snapshot.expirationLabel ? (
                  <SummaryRow label="Expiration" value={approval.snapshot.expirationLabel} />
                ) : null}
              </dl>
            </section>

            <section className="vmb-send-package-modal__preview" aria-label="Send preview">
              <h3 className="vmb-send-package-modal__column-title">Send Preview</h3>

              <div className="vmb-send-package-modal__block">
                <p className="vmb-send-package-modal__block-label">Email Subject Line</p>
                <p className="vmb-send-package-modal__subject">{copy.subjectLine}</p>
              </div>

              <div className="vmb-send-package-modal__block">
                <p className="vmb-send-package-modal__block-label">Email Envelope Preview</p>
                <div className="vmb-send-package-modal__envelope">
                  <p className="vmb-send-package-modal__envelope-headline">{copy.envelopeHeadline}</p>
                  <p className="vmb-send-package-modal__envelope-body">{copy.envelopeBody}</p>
                  <button type="button" className="vmb-send-package-modal__envelope-cta" disabled>
                    {copy.envelopeCtaLabel}
                  </button>
                </div>
              </div>

              <div className="vmb-send-package-modal__block">
                <p className="vmb-send-package-modal__block-label">Invitation Card Preview</p>
                <SalonInviteCard {...cardProps} mode="salon" />
              </div>

              <div className="vmb-send-package-modal__block">
                <p className="vmb-send-package-modal__block-label">Destination</p>
                <div className="vmb-send-package-modal__destination">
                  <p className="vmb-send-package-modal__destination-label">Landing page</p>
                  <p className="vmb-send-package-modal__destination-title">{landingTitle}</p>
                  <ViewSalonPageLink />
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="vmb-send-package-modal__footer">
          <button type="button" className="vmb-send-package-modal__send-stub" disabled>
            Send Email — Coming Next
          </button>
          <button
            type="button"
            className="vmb-send-package-modal__close"
            onClick={onClose}
            style={{ color: VMB_THEME.muted }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
