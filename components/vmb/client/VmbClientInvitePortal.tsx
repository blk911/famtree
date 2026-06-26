"use client";

import { useCallback, useEffect, useState } from "react";
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
  token?: string;
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

export function VmbClientInvitePortal({ inviteId, contact, token = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<ClientInviteDto | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("Tomorrow · 10:00 AM");
  const [clientContact, setClientContact] = useState(contact);

  const loadInvite = useCallback(async () => {
    const trimmedToken = token.trim();
    const trimmedInviteId = inviteId.trim();
    const trimmedContact = clientContact.trim();
    if (!trimmedToken && (!trimmedInviteId || !trimmedContact)) {
      setError("Invite lookup needs an invite.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = trimmedToken
        ? `/api/vmb/client-invites/token?token=${encodeURIComponent(trimmedToken)}`
        : `/api/vmb/client-invites/${encodeURIComponent(trimmedInviteId)}?contact=${encodeURIComponent(trimmedContact)}`;
      const response = await fetch(endpoint, { cache: "no-store", credentials: "include" });
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
  }, [clientContact, inviteId, token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function recordClientIntent(action: "book" | "hold" | "personalize") {
    if (!invite) return;
    if (!clientContact.trim()) {
      setNotice("Add the email or mobile number your salon used for this gift, then choose your next step.");
      return;
    }
    setClaiming(true);
    setNotice(null);
    try {
      const hasToken = token.trim().length > 0;
      const response = hasToken
        ? await fetch("/api/vmb/invite-claims", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              inviteId: token,
              name: invite.snapshot.recipientName,
              contact: clientContact,
            }),
          })
        : await fetch(`/api/vmb/client-invites/${encodeURIComponent(invite.id)}`, {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contact: clientContact,
              clientName: invite.snapshot.recipientName,
              action,
              requestedSlot: action === "book" ? selectedSlot : undefined,
              note: action === "personalize" ? "Client wants to personalize this gift before booking." : undefined,
            }),
          });
      const json = (await response.json()) as { ok?: boolean; alreadyClaimed?: boolean; action?: string; error?: string; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not claim invite.");
      if (action === "book") {
        setNotice(hasToken ? `Gift saved. Calendar booking for ${selectedSlot} is next in this flow.` : `Booking request saved for ${selectedSlot}. Your salon can now confirm the time.`);
      } else if (action === "personalize") {
        setNotice(hasToken ? "Gift saved. Customization choices are next in this flow." : "Personalization request saved. Your salon can see what you want to refine.");
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
  const serviceLine = services.length > 0 ? services.join(" · ") : "Your private salon gift";
  const levelUpLine = rewards.length > 0 ? rewards.join(" · ") : "Salon-selected finishing touch";
  const expiration = stripValidPrefix(snapshot?.expirationLabel);

  return (
    <main className="vmb-client-home">
      {loading ? (
        <section className="vmb-client-home__empty">
          <p>Finding your invite…</p>
        </section>
      ) : error ? (
        <section className="vmb-client-home__empty">
          <p className="vmb-client-home__eyebrow">Invitation unavailable</p>
          <p>{error}</p>
        </section>
      ) : snapshot ? (
        <section className="vmb-client-home__shell">
          <header className="vmb-client-home__top">
            <div className="vmb-client-home__profile">
              <span className="vmb-client-home__avatar" aria-hidden="true">{clientFirstName.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="vmb-client-home__eyebrow">VMB Client</p>
                <h1>{clientFirstName}</h1>
                <p>Denver, CO · Private salon gifts and appointments</p>
              </div>
            </div>
            <aside className="vmb-client-home__sponsor" aria-label="Sponsor salon">
              <span className="vmb-client-home__sponsor-avatar" aria-hidden="true">{ownerInitial}</span>
              <div>
                <p>Sponsored by</p>
                <strong>{salonName}</strong>
                <span>{providerName}</span>
              </div>
            </aside>
          </header>

          <section className="vmb-client-home__hero">
            <div className="vmb-client-home__hero-copy">
              <p className="vmb-client-home__eyebrow">Current gift</p>
              <h2>{snapshot.headline}</h2>
              <p>{snapshot.body}</p>
            </div>
            <div className="vmb-client-home__hero-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="" />
            </div>
          </section>

          <section className="vmb-client-home__grid">
            <article className="vmb-client-home__module vmb-client-home__module--primary">
              <div>
                <p className="vmb-client-home__eyebrow">Active birthday offer</p>
                <h3>{serviceLine}</h3>
                <p className="vmb-client-home__offer-note">
                  Your {serviceLine} special is available now or held {expiration}.
                </p>
              </div>

              <div className="vmb-client-home__gift-box">
                <span>Level up with</span>
                {rewards.length > 0 ? (
                  <ul className="vmb-client-home__chips" aria-label="Included level ups">
                    {rewards.map((reward) => (
                      <li key={reward}>{reward}</li>
                    ))}
                  </ul>
                ) : (
                  <strong>{levelUpLine}</strong>
                )}
                <p>Good through {expiration}</p>
              </div>

              {!clientContact.trim() ? (
                <label className="vmb-client-home__contact">
                  <span>Email or mobile for salon follow-up</span>
                  <input
                    value={clientContact}
                    onChange={(event) => setClientContact(event.target.value)}
                    placeholder="deb@test.com"
                  />
                </label>
              ) : null}

              {notice ? <p className="vmb-client-home__notice">{notice}</p> : null}

              {calendarOpen ? (
                <div className="vmb-client-home__calendar" aria-label="Choose a preferred time">
                  <p>Choose a preferred time</p>
                  <div className="vmb-client-home__slot-grid">
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
                    className="vmb-client-home__button vmb-client-home__button--primary"
                    onClick={() => void recordClientIntent("book")}
                    disabled={claiming}
                  >
                    {claiming ? "Saving..." : "Request This Time"}
                  </button>
                </div>
              ) : null}

              <div className="vmb-client-home__actions">
                <button type="button" className="vmb-client-home__button vmb-client-home__button--primary" onClick={() => setCalendarOpen((open) => !open)} disabled={claiming}>
                  Book Now
                </button>
                <button type="button" className="vmb-client-home__button vmb-client-home__button--secondary" onClick={() => void recordClientIntent("personalize")} disabled={claiming}>
                  Customize My Gift
                </button>
                <button type="button" className="vmb-client-home__button vmb-client-home__button--quiet" onClick={() => void recordClientIntent("hold")} disabled={claiming}>
                  Hold for Later
                </button>
              </div>
            </article>

            <aside className="vmb-client-home__module">
              <p className="vmb-client-home__eyebrow">Coming next</p>
              <h3>Your salon activity</h3>
              <ul className="vmb-client-home__activity">
                <li>Saved gifts and private offers</li>
                <li>Appointment follow-ups</li>
                <li>Favorite salon services</li>
              </ul>
            </aside>
          </section>
        </section>
      ) : null}
    </main>
  );
}
