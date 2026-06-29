"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type BookingSlot = {
  label: string;
  day: number;
  dayLabel?: string;
  startsAtMinutes: number;
};

type Props = {
  inviteId: string;
  contact: string;
  token?: string;
};

type GiftLevelUp = {
  id: string;
  label: string;
  price: number;
};

const GEL_X_LEVEL_UPS: GiftLevelUp[] = [
  { id: "medium-length", label: "Medium Length", price: 10 },
  { id: "long-length", label: "Long Length", price: 20 },
  { id: "xl-length", label: "XL Length", price: 35 },
  { id: "french", label: "French", price: 12 },
  { id: "chrome", label: "Chrome", price: 15 },
  { id: "crystals", label: "Crystals", price: 15 },
  { id: "freestyle-art", label: "Freestyle Art", price: 25 },
];

const TAX_RATE = 0.0825;
const VMB_COMARKET_RATE = 0.05;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const FALLBACK_BOOKING_SLOTS: BookingSlot[] = [
  { label: "Mon · 10:00 AM", day: 1, dayLabel: "Mon", startsAtMinutes: 10 * 60 },
  { label: "Mon · 2:30 PM", day: 1, dayLabel: "Mon", startsAtMinutes: 14 * 60 + 30 },
  { label: "Fri · 11:00 AM", day: 5, dayLabel: "Fri", startsAtMinutes: 11 * 60 },
  { label: "Sat · 1:00 PM", day: 6, dayLabel: "Sat", startsAtMinutes: 13 * 60 },
];

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

function parsePrice(label?: string): number {
  const match = label?.match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function rewardMatchesLevelUp(reward: string, levelUp: GiftLevelUp): boolean {
  const normalizedReward = reward.toLowerCase();
  const normalizedLabel = levelUp.label.toLowerCase();
  const compactReward = normalizedReward.replace(/\s+upgrade|\s+accent|\s+tip/g, "");
  const compactLabel = normalizedLabel.replace(/s$/g, "");
  return normalizedReward.includes(normalizedLabel)
    || normalizedReward.includes(compactLabel)
    || normalizedLabel.includes(compactReward);
}

function initialSelectedLevelUps(rewards: string[]): string[] {
  return GEL_X_LEVEL_UPS
    .filter((levelUp) => rewards.some((reward) => rewardMatchesLevelUp(reward, levelUp)))
    .map((levelUp) => levelUp.id);
}

export function VmbClientInvitePortal({ inviteId, contact, token = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<ClientInviteDto | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [clientContact, setClientContact] = useState(contact);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(10);
  const [selectedLevelUpIds, setSelectedLevelUpIds] = useState<string[]>([]);

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
      setSelectedLevelUpIds(initialSelectedLevelUps(json.invite.snapshot.rewards ?? []));
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
    if (action === "book" && !selectedSlot) {
      setNotice("Choose a date and time before booking this gift.");
      return;
    }
    if (!clientContact.trim()) {
      setNotice("Add the email or mobile number your salon used for this gift, then choose your next step.");
      return;
    }
    setClaiming(true);
    setNotice(null);
    const booking = action === "book" ? {
      serviceLine,
      selectedLevelUps: selectedLevelUps.map((levelUp) => ({ label: levelUp.label, price: levelUp.price })),
      requestedSlot: selectedSlot,
      subtotal,
      tax,
      vmbComarket,
      total,
      paymentStatus: "stripe_stub" as const,
    } : undefined;
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
              action,
              requestedSlot: action === "book" ? selectedSlot : undefined,
              note: action === "book"
                ? `Client selected ${selectedSlot} with ${selectedLevelUps.map((levelUp) => levelUp.label).join(", ") || "no added level-ups"}.`
                : action === "personalize"
                  ? "Client wants to personalize this gift before booking."
                  : undefined,
              booking,
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
              note: action === "book"
                ? `Client selected ${selectedSlot} with ${selectedLevelUps.map((levelUp) => levelUp.label).join(", ") || "no added level-ups"}.`
                : action === "personalize"
                  ? "Client wants to personalize this gift before booking."
                  : undefined,
              booking,
            }),
          });
      const json = (await response.json()) as { ok?: boolean; alreadyClaimed?: boolean; action?: string; error?: string; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not claim invite.");
      if (action === "book") {
        setNotice(hasToken ? `Gift saved. Calendar booking for ${selectedSlot} is next in this flow.` : `Booking request saved for ${selectedSlot}. Your salon can now confirm the time.`);
        setSuccessCountdown(10);
        setSuccessModalOpen(true);
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

  async function openCalendar() {
    setCalendarModalOpen(true);
    if (!token.trim() || slots.length > 0) return;
    setSlotsLoading(true);
    try {
      const response = await fetch(`/api/vmb/client-invites/booking-slots?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as { ok?: boolean; slots?: BookingSlot[]; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Could not load booking times.");
      const nextSlots = json.slots ?? [];
      setSlots(nextSlots);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not load booking times.");
    } finally {
      setSlotsLoading(false);
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
  const requestSlots = slots.length > 0 ? slots : FALLBACK_BOOKING_SLOTS;
  const salonWorkDays = useMemo(
    () => DAY_LABELS.map((label, day) => ({
      day,
      label,
      slots: requestSlots.filter((slot) => slot.day === day),
    })),
    [requestSlots],
  );
  const activeDay = selectedDay ?? salonWorkDays.find((day) => day.slots.length > 0)?.day ?? null;
  const activeDaySlots = activeDay === null ? [] : requestSlots.filter((slot) => slot.day === activeDay);
  const serviceLine = services.length > 0 ? services.join(" · ") : "Your private salon gift";
  const levelUpLine = rewards.length > 0 ? rewards.join(" · ") : "Salon-selected finishing touch";
  const expiration = stripValidPrefix(snapshot?.expirationLabel);
  const baseServicePrice = parsePrice(snapshot?.priceLabel) || 90;
  const selectedLevelUps = useMemo(
    () => GEL_X_LEVEL_UPS.filter((levelUp) => selectedLevelUpIds.includes(levelUp.id)),
    [selectedLevelUpIds],
  );
  const levelUpTotal = selectedLevelUps.reduce((total, levelUp) => total + levelUp.price, 0);
  const subtotal = baseServicePrice + levelUpTotal;
  const tax = subtotal * TAX_RATE;
  const vmbComarket = subtotal * VMB_COMARKET_RATE;
  const total = subtotal + tax + vmbComarket;
  const appointmentReady = Boolean(selectedSlot);

  useEffect(() => {
    if (!selectedSlot) setOrderConfirmed(false);
  }, [selectedSlot]);

  useEffect(() => {
    if (!calendarModalOpen) return;
    const selectedSlotDay = requestSlots.find((slot) => slot.label === selectedSlot)?.day;
    const nextDay = selectedSlotDay ?? salonWorkDays.find((day) => day.slots.length > 0)?.day ?? null;
    if (nextDay !== null && selectedDay !== nextDay && !salonWorkDays.some((day) => day.day === selectedDay && day.slots.length > 0)) {
      setSelectedDay(nextDay);
    }
  }, [calendarModalOpen, requestSlots, salonWorkDays, selectedDay, selectedSlot]);

  useEffect(() => {
    if (!successModalOpen) return;
    if (successCountdown <= 0) {
      setSuccessModalOpen(false);
      setOfferOpen(false);
      setSuccessCountdown(10);
      return;
    }
    const timer = window.setTimeout(() => setSuccessCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [successCountdown, successModalOpen]);

  function toggleLevelUp(id: string) {
    setOrderConfirmed(false);
    setSelectedLevelUpIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function closeSuccessModal() {
    setSuccessModalOpen(false);
    setOfferOpen(false);
    setSuccessCountdown(10);
  }

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
            <div className="vmb-client-home__identity">
              <div className="vmb-client-home__profile">
                <span className="vmb-client-home__avatar" aria-hidden="true">{clientFirstName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <p className="vmb-client-home__eyebrow">VMB Client</p>
                  <h1>{clientFirstName}</h1>
                  <p>Denver, CO · Private salon gifts and appointments</p>
                </div>
              </div>
              <nav className="vmb-client-home__nav" aria-label="Client sections">
                <a href="#gift">Gifts</a>
                <a href="#salons">My Salons</a>
                <a href="#style">My Style</a>
                <a href="#profile">Profile</a>
              </nav>
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
              <p className="vmb-client-home__eyebrow">A note from {salonName}</p>
              <h2>{snapshot.headline}</h2>
              <p>{snapshot.body}</p>
              <p className="vmb-client-home__gift-line">
                Your {serviceLine} with {levelUpLine} is available now or held {expiration}.
              </p>
              <button
                type="button"
                className="vmb-client-home__hero-cta"
                onClick={() => setOfferOpen(true)}
              >
                Open My Birthday Gift
              </button>
            </div>
            <div className="vmb-client-home__hero-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="" />
            </div>
          </section>

          <section className={`vmb-client-home__grid${offerOpen ? " is-open" : ""}`} id="gift">
            {offerOpen ? (
              <div className="vmb-client-home__offer-workspace">
                <article className="vmb-client-home__module vmb-client-home__module--primary">
                  <div>
                    <p className="vmb-client-home__eyebrow">Customize your gift</p>
                    <h3>{serviceLine}</h3>
                    <p className="vmb-client-home__offer-note">
                      Soft gel extensions with shape, length, and polish. Choose the level-ups you want included before booking.
                    </p>
                  </div>

                  <section className="vmb-client-home__service-summary" aria-label="Service summary">
                    <div>
                      <span>Base service</span>
                      <strong>{formatMoney(baseServicePrice)}</strong>
                    </div>
                    <div>
                      <span>Estimated time</span>
                      <strong>90 min</strong>
                    </div>
                  </section>

                  <section className="vmb-client-home__included">
                    <span>Included service elements</span>
                    <p>Nail prep · short extensions · standard shape · gel color · finish</p>
                  </section>

                  <section className="vmb-client-home__level-ups" aria-label="Available level-ups">
                    <span>Available level-ups</span>
                    <ul>
                      {GEL_X_LEVEL_UPS.map((levelUp) => (
                        <li key={levelUp.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedLevelUpIds.includes(levelUp.id)}
                              onChange={() => toggleLevelUp(levelUp.id)}
                            />
                            <strong>{levelUp.label}</strong>
                          </label>
                          <em>{formatMoney(levelUp.price)}</em>
                        </li>
                      ))}
                    </ul>
                  </section>

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
                </article>

                <aside className="vmb-client-home__module vmb-client-home__receipt" aria-label="Appointment receipt">
                  <p className="vmb-client-home__eyebrow">Your appointment</p>
                  <h3>{snapshot.inviteTypeLabel}</h3>

                  <section className="vmb-client-home__receipt-step">
                    <div>
                      <span>Step 1</span>
                      <strong>{selectedSlot || "Pick your date and time"}</strong>
                    </div>
                    <button type="button" onClick={() => void openCalendar()} disabled={slotsLoading}>
                      {slotsLoading ? "Loading..." : selectedSlot ? "Change" : "Choose"}
                    </button>
                  </section>

                  {appointmentReady ? (
                    <>
                      <section className="vmb-client-home__receipt-step vmb-client-home__receipt-step--confirm">
                        <div>
                          <span>Step 2</span>
                          <strong>Confirm your selections</strong>
                        </div>
                      </section>

                      <dl className="vmb-client-home__receipt-lines">
                        <div>
                          <dt>{serviceLine}</dt>
                          <dd>{formatMoney(baseServicePrice)}</dd>
                        </div>
                        {selectedLevelUps.map((levelUp) => (
                          <div key={levelUp.id}>
                            <dt>{levelUp.label}</dt>
                            <dd>{formatMoney(levelUp.price)}</dd>
                          </div>
                        ))}
                        <div>
                          <dt>Appointment time</dt>
                          <dd>{selectedSlot}</dd>
                        </div>
                        <div>
                          <dt>Subtotal</dt>
                          <dd>{formatMoney(subtotal)}</dd>
                        </div>
                        <div>
                          <dt>Tax estimate</dt>
                          <dd>{formatMoney(tax)}</dd>
                        </div>
                        <div>
                          <dt>VMB co-marketing (5%)</dt>
                          <dd>{formatMoney(vmbComarket)}</dd>
                        </div>
                        <div className="vmb-client-home__receipt-total">
                          <dt>Total</dt>
                          <dd>{formatMoney(total)}</dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <div className="vmb-client-home__receipt-mask">
                      Choose an appointment time to unlock your final receipt and booking options.
                    </div>
                  )}

                  {notice ? <p className="vmb-client-home__notice">{notice}</p> : null}

                  {appointmentReady ? (
                    <section className="vmb-client-home__receipt-step vmb-client-home__receipt-step--actions">
                      <div>
                        <span>Step 3</span>
                        <strong>{orderConfirmed ? "Book or save for later" : "Confirm before booking"}</strong>
                      </div>
                      {orderConfirmed ? (
                        <div className="vmb-client-home__receipt-actions">
                          <button type="button" className="vmb-client-home__button vmb-client-home__button--primary" onClick={() => void recordClientIntent("book")} disabled={claiming}>
                            {claiming ? "Saving..." : "Book My Appointment"}
                          </button>
                          <button type="button" className="vmb-client-home__button vmb-client-home__button--quiet" onClick={() => void recordClientIntent("hold")} disabled={claiming}>
                            Save for Later
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="vmb-client-home__button vmb-client-home__button--primary" onClick={() => setOrderConfirmed(true)}>
                          Confirm Order
                        </button>
                      )}
                    </section>
                  ) : null}
                </aside>
              </div>
            ) : (
              <article className="vmb-client-home__module vmb-client-home__module--pending">
                <p className="vmb-client-home__eyebrow">Birthday gift waiting</p>
                <h3>Open your gift when you are ready.</h3>
                <p>
                  Your salon tucked the offer details away so this page can stay personal first. Open it when you want to choose a time, personalize the style, or hold it for later.
                </p>
                <button
                  type="button"
                  className="vmb-client-home__button vmb-client-home__button--primary"
                  onClick={() => setOfferOpen(true)}
                >
                  View Birthday Offer
                </button>
              </article>
            )}

            <aside className="vmb-client-home__module vmb-client-home__module--salon" id="salons">
              <p className="vmb-client-home__eyebrow">Your salon space</p>
              <h3>Gifts, bookings, and notes</h3>
              <ul className="vmb-client-home__activity">
                <li><strong>Gift shelf</strong><span>Private offers waiting for you</span></li>
                <li><strong>Appointments</strong><span>Requests, confirmations, and follow-ups</span></li>
                <li><strong>My Style</strong><span>Favorite services, colors, and salon notes</span></li>
                <li><strong>Profile</strong><span>How your salon can reach you</span></li>
              </ul>
            </aside>
          </section>

          {calendarModalOpen ? (
            <div className="vmb-client-home__calendar-modal" role="dialog" aria-modal="true" aria-label="Choose appointment time">
              <div className="vmb-client-home__calendar-card">
                <button type="button" className="vmb-client-home__calendar-close" onClick={() => setCalendarModalOpen(false)}>
                  Close
                </button>
                <p className="vmb-client-home__eyebrow">Salon calendar</p>
                <h3>Choose your appointment time</h3>
                <p>{slotsLoading ? "Loading salon openings..." : "Choose an open salon day, then pick a time that works for you."}</p>
                <div className="vmb-client-home__calendar-picker">
                  <div className="vmb-client-home__day-strip" aria-label="Salon work days">
                    {salonWorkDays.map((day) => {
                      const isOpen = day.slots.length > 0;
                      return (
                        <button
                          key={day.day}
                          type="button"
                          className={activeDay === day.day ? "is-selected" : ""}
                          disabled={!isOpen}
                          onClick={() => setSelectedDay(day.day)}
                        >
                          <span>{day.label}</span>
                          <em>{isOpen ? `${day.slots.length} openings` : "Closed"}</em>
                        </button>
                      );
                    })}
                  </div>
                  <div className="vmb-client-home__slot-grid vmb-client-home__slot-grid--modal">
                    {activeDaySlots.map((slot) => (
                      <button
                        key={`${slot.day}-${slot.startsAtMinutes}-${slot.label}`}
                        type="button"
                        className={slot.label === selectedSlot ? "is-selected" : ""}
                        onClick={() => {
                          setSelectedSlot(slot.label);
                          setOrderConfirmed(false);
                          setSelectedDay(slot.day);
                          setCalendarModalOpen(false);
                        }}
                      >
                        {slot.label.replace(/^[^·]+·\s*/, "")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {successModalOpen ? (
            <div className="vmb-client-home__success-modal" role="dialog" aria-modal="true" aria-label="Booking request confirmed">
              <div className="vmb-client-home__success-card">
                <div className="vmb-client-home__sparkler" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="vmb-client-home__eyebrow">Confirmed</p>
                <h3>Your birthday gift is on its way.</h3>
                <p>
                  We saved {selectedSlot} with your selected style. {salonName} can see the request and will confirm the final appointment.
                </p>
                <button type="button" className="vmb-client-home__button vmb-client-home__button--primary" onClick={closeSuccessModal}>
                  Close
                </button>
                <p className="vmb-client-home__success-count">Returning to your client page in {successCountdown}s</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
