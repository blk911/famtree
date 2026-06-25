"use client";

import { useCallback, useEffect, useState } from "react";
import { InvitationEnvelope } from "@/components/vmb/invites/InvitationEnvelope";
import { getFallbackServiceAsset } from "@/lib/vmb/assets/service-photo-library";
import type { SentInvite, SentInvitePublicSnapshot } from "@/lib/vmb/invites/sent-invite-types";

type ClientInviteDto = {
  id: string;
  status: SentInvite["status"];
  alreadyClaimed: boolean;
  sentAt: string;
  expiresAt: string;
  snapshot: SentInvitePublicSnapshot;
};

type Props = {
  inviteId: string;
  contact: string;
};

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

function salonInitials(name?: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return initials || "V";
}

function stripValidPrefix(label?: string): string {
  return label?.replace(/^Valid\s+/i, "").trim() || "your private invite window";
}

export function VmbClientInvitePortal({ inviteId, contact }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<ClientInviteDto | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    if (!inviteId || !contact) {
      setError("Invite lookup needs an invite and email.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/vmb/client-invites/${encodeURIComponent(inviteId)}?contact=${encodeURIComponent(contact)}`,
        { cache: "no-store", credentials: "include" },
      );
      const json = (await response.json()) as { ok?: boolean; invite?: ClientInviteDto; error?: string };
      if (!response.ok || !json.ok || !json.invite) {
        throw new Error(json.error ?? "Could not load invite.");
      }
      setInvite(json.invite);
      setNotice(json.invite.alreadyClaimed ? "This invite is already claimed and waiting for the salon." : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invite.");
    } finally {
      setLoading(false);
    }
  }, [contact, inviteId]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function claimInvite(action: "book" | "hold" | "revise") {
    if (!invite) return;
    if (action === "hold") {
      setNotice("Held for now. Your salon can still see this invite is waiting.");
      return;
    }
    if (action === "revise") {
      setNotice("Revision request noted. We will wire the salon callback next.");
      return;
    }
    setClaiming(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/vmb/client-invites/${encodeURIComponent(invite.id)}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact, clientName: invite.snapshot.recipientName }),
      });
      const json = (await response.json()) as { ok?: boolean; alreadyClaimed?: boolean; error?: string; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not claim invite.");
      setNotice(json.alreadyClaimed ? "Already claimed. You are all set." : "Claimed. Your salon can now see this invite.");
      setInvite((current) => current ? { ...current, alreadyClaimed: true, status: "claimed" } : current);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not claim invite.");
    } finally {
      setClaiming(false);
    }
  }

  const snapshot = invite?.snapshot;
  const services = snapshot?.services ?? [];
  const rewards = snapshot?.rewards ?? [];
  const clientFirstName = firstName(snapshot?.recipientName);
  const salonName = snapshot?.salonDisplayName ?? "Your salon";
  const providerName = snapshot?.providerName ?? "Your nail tech";
  const heroImageUrl = snapshot?.inviteArtImageUrl?.trim() || snapshot?.serviceImageUrl?.trim() || getFallbackServiceAsset().imageUrl;
  const ownerInitial = salonInitials(providerName || salonName);

  return (
    <main className="vmb-public-invite">
      <nav className="vmb-public-invite__topbar" aria-label="Invitation">
        <div className="vmb-public-invite__brand">
          <strong>VMB</strong>
          <span>Client Invite</span>
        </div>
        {snapshot ? (
          <div className="vmb-public-invite__identity-pill">
            <span className="vmb-public-invite__identity-avatar" aria-hidden="true">{ownerInitial}</span>
            <span>
              <strong>{providerName} · {salonName}</strong>
              <small>{snapshot.inviteTypeLabel}</small>
            </span>
          </div>
        ) : null}
      </nav>

      {loading ? (
        <section className="vmb-public-invite__unavailable">
          <p>Finding your invite…</p>
        </section>
      ) : error ? (
        <section className="vmb-public-invite__unavailable">
          <p className="vmb-public-invite__eyebrow">Invitation unavailable</p>
          <p>{error}</p>
        </section>
      ) : snapshot ? (
        <InvitationEnvelope clientFirstName={clientFirstName} salonName={salonName} inviteTitle={snapshot.headline}>
          <article className="vmb-public-invite__card" aria-label="Private salon invitation">
            <div className="vmb-public-invite__card-top">
              <div className="vmb-public-invite__hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImageUrl} alt="" className="vmb-public-invite__hero-img" />
              </div>

              <div className="vmb-public-invite__body">
                <div className="vmb-public-invite__crest" aria-hidden>{ownerInitial}</div>
                <p className="vmb-public-invite__eyebrow">Private Invitation</p>
                <p className="vmb-public-invite__hello">Hi {clientFirstName}</p>
                <h1>{snapshot.headline}</h1>
                <p className="vmb-public-invite__note">
                  {salonName} has something beautiful waiting for you.
                </p>
                <p className="vmb-public-invite__letter">{snapshot.body}</p>
              </div>
            </div>

            <div className="vmb-public-invite__card-bottom">
              <section className="vmb-public-invite__gift" aria-label="Your gift details">
                <p className="vmb-public-invite__gift-label">Your Gift</p>
                {services.length > 0 ? (
                  <strong className="vmb-public-invite__gift-service">{services.join(" · ")}</strong>
                ) : (
                  <strong className="vmb-public-invite__gift-service">Your private salon gift</strong>
                )}
                {rewards.length > 0 ? (
                  <ul className="vmb-public-invite__gift-chips" aria-label="Included level ups">
                    {rewards.map((reward) => (
                      <li key={reward}>{reward}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="vmb-public-invite__valid">
                  <span>Good Through</span>
                  <strong>{stripValidPrefix(snapshot.expirationLabel)}</strong>
                </div>
              </section>

              <section className="vmb-public-invite__action-panel" aria-label="Choose how to enjoy your invite">
                <p className="vmb-public-invite__gift-label">Claim Your Gift</p>
                <p className="vmb-public-invite__action-copy">
                  Claim your invite, ask for a small adjustment, or hold it while you decide.
                </p>
                {notice ? <p className="vmb-public-invite__notice">{notice}</p> : null}
                <div className="vmb-public-invite__actions">
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--primary"
                    onClick={() => void claimInvite("book")}
                    disabled={claiming || invite?.alreadyClaimed}
                  >
                    {invite?.alreadyClaimed ? "Claimed" : claiming ? "Claiming..." : "Claim My Gift"}
                  </button>
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--secondary"
                    onClick={() => void claimInvite("revise")}
                  >
                    Ask for an Adjustment
                  </button>
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--quiet"
                    onClick={() => void claimInvite("hold")}
                  >
                    Hold Until Later
                  </button>
                </div>
              </section>
            </div>

            <p className="vmb-public-invite__closing">With love, {salonName}</p>
          </article>
        </InvitationEnvelope>
      ) : null}
    </main>
  );
}
