"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  open: boolean;
  onGotIt: (dontShowAgain: boolean) => void;
  onShowAgain: () => void;
};

const EXAMPLES = [
  "Who should join my PCN?",
  "Who is overdue?",
  "Who were my January clients?",
  "Tell me about Maya",
  "Which services are most popular?",
];

export function LaunchGuideSummaryModal({ open, onGotIt, onShowAgain }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!open) return null;

  return (
    <div className="vmb-launch-guide-summary" role="dialog" aria-modal="true" aria-labelledby="launch-guide-summary-title">
      <div className="vmb-launch-guide-summary__card">
        <h2 id="launch-guide-summary-title" className="vmb-launch-guide-summary__title">
          🎉 You&apos;re Ready
        </h2>
        <p className="vmb-launch-guide-summary__body">
          VMB has analyzed your client book and identified relationship opportunities that may help grow
          your business.
        </p>
        <p className="vmb-launch-guide-summary__body">
          TAIKOS is now available throughout the platform to answer questions about your clients, services,
          appointments, opportunities, and relationships.
        </p>
        <ul className="vmb-launch-guide-summary__examples">
          {EXAMPLES.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        <p className="vmb-launch-guide-summary__body">
          TAIKOS is designed to answer questions about your business and the information you&apos;ve provided.
          Nothing is ever sent automatically. You review. You approve. You stay in control.
        </p>
        <footer className="vmb-launch-guide-summary__footer">
          <span>Need help later? Use the ? icon anytime to restart the Launch Guide.</span>
          <button type="button" className="vmb-launch-guide-summary__link" onClick={onShowAgain}>
            Launch Guide
          </button>
          <Link href="/vmb/faq">FAQ</Link>
          <Link href="/vmb/support">Support</Link>
        </footer>
        <label className="vmb-launch-guide-summary__checkbox">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don&apos;t show again
        </label>
        <div className="vmb-launch-guide-summary__actions">
          <button type="button" className="vmb-launch-guide-summary__btn vmb-launch-guide-summary__btn--ghost" onClick={onShowAgain}>
            Show Guide Again
          </button>
          <button type="button" className="vmb-launch-guide-summary__btn" onClick={() => onGotIt(dontShowAgain)}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
