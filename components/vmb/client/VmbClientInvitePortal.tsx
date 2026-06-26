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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("Tomorrow · 10:00 AM");

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

  async function recordClientIntent(action: "book" | "hold" | "personalize") {
    if (!invite) return;
    setClaiming(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/vmb/client-invites/${encodeURIComponent(invite.id)}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact,
          clientName: invite.snapshot.recipientName,
          action,
          requestedSlot: action === "book" ? selectedSlot : undefined,
          note: action === "personalize" ? "Client wants to personalize this gift before booking." : undefined,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; alreadyClaimed?: boolean; action?: string; error?: string; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not claim invite.");
      if (action === "book") {
        setNotice(`Booking request saved for ${selectedSlot}. Your salon can now confirm the time.`);
      } else if (action === "personalize") {
        setNotice("Personalization request saved. Your salon can see what you want to refine.");
      } else {
        setNotice("Saved for later. This gift will stay in your client space while it is available.");
      }
      setInvite((current) => current ? { ...current, alreadyClaimed: true, status: "claimed" } : current);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update invite.");
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
  const requestSlots = ["Tomorrow · 10:00 AM", "Tomorrow · 2:30 PM", "Friday · 11:00 AM", "Saturday · 1:00 PM"];

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
                  Choose a time, personalize the style, or save this gift while you decide.
                </p>
                {notice ? <p className="vmb-public-invite__notice">{notice}</p> : null}
                {calendarOpen ? (
                  <div className="vmb-public-invite__calendar" aria-label="Choose a preferred time">
                    <p className="vmb-public-invite__calendar-title">Choose a preferred time</p>
                    <div className="vmb-public-invite__slot-grid">
                      {requestSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={slot === selectedSlot ? "is-selected" : ""}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="vmb-public-invite__button vmb-public-invite__button--primary"
                      onClick={() => void recordClientIntent("book")}
                      disabled={claiming}
                    >
                      {claiming ? "Saving..." : "Request This Time"}
                    </button>
                  </div>
                ) : null}
                <div className="vmb-public-invite__actions">
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--primary"
                    onClick={() => setCalendarOpen((open) => !open)}
                    disabled={claiming}
                  >
                    Book Now
                  </button>
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--secondary"
                    onClick={() => void recordClientIntent("personalize")}
                    disabled={claiming}
                  >
                    Personalize My Gift
                  </button>
                  <button
                    type="button"
                    className="vmb-public-invite__button vmb-public-invite__button--quiet"
                    onClick={() => void recordClientIntent("hold")}
                    disabled={claiming}
                  >
                    Save for Later
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
