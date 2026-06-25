"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type InvitationEnvelopeProps = {
  clientFirstName: string;
  salonName: string;
  inviteTitle: string;
  children: ReactNode;
};

export function InvitationEnvelope({ clientFirstName, salonName, inviteTitle, children }: InvitationEnvelopeProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`vmb-public-invite__experience${open ? " is-open" : ""}`} aria-live="polite">
      {!open ? (
        <div className="vmb-public-invite__envelope" aria-label="Closed private invitation">
          <div className="vmb-public-invite__envelope-art" aria-hidden="true">
            <span className="vmb-public-invite__envelope-flap" />
            <span className="vmb-public-invite__envelope-seal">VMB</span>
          </div>
          <p className="vmb-public-invite__eyebrow">Private Invitation</p>
          <h1>{inviteTitle}</h1>
          <p>
            {salonName} has something beautiful waiting for you, {clientFirstName}.
          </p>
          <button type="button" className="vmb-public-invite__open-button" onClick={() => setOpen(true)}>
            Open Your Invitation
          </button>
        </div>
      ) : null}

      <div className="vmb-public-invite__reveal" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
