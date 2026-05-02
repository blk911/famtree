"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { StudioOffer } from "@/types/studios";
import { formatOfferPriceUsd } from "@/lib/studios/mockStudios";
import { STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

type Props = {
  open: boolean;
  onClose: () => void;
  offer: StudioOffer | null;
  providerName: string;
};

export function OfferRequestModal({ open, onClose, offer, providerName }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (!open || !offer) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO(studios:api): POST /api/studios/requests { offerId, name, email, message }
    setSent(true);
  };

  const close = () => {
    setSent(false);
    setName("");
    setEmail("");
    setMessage("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(38, 38, 38, 0.35)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-request-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) close();
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
        style={{ border: `1px solid ${STUDIOS_LINE}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-start justify-between gap-4 border-b px-6 py-5"
          style={{ borderColor: STUDIOS_LINE, background: "#fff" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: STUDIOS_MUTED }}>
              Request a service
            </p>
            <h2 id="offer-request-title" className="mt-1 text-xl font-bold tracking-tight" style={{ color: STUDIOS_INK }}>
              {offer.title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: STUDIOS_MUTED }}>
              with {providerName} · {formatOfferPriceUsd(offer.priceCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 transition hover:bg-black/[0.04]"
            style={{ color: STUDIOS_MUTED }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-8 text-center">
            <p className="text-lg font-semibold" style={{ color: STUDIOS_INK }}>
              Thanks — you&apos;re all set.
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: STUDIOS_MUTED }}>
              {providerName} will review your request for <strong style={{ color: STUDIOS_INK }}>{offer.title}</strong>.
              We&apos;ll follow up by email when this flow is wired to the server.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ background: STUDIOS_INK }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5">
            <p className="mb-4 text-sm leading-relaxed" style={{ color: STUDIOS_MUTED }}>
              Tell us a bit about you. No payment today — this is a request to connect.
            </p>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: STUDIOS_MUTED }}>
                Full name
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                style={{ borderColor: STUDIOS_LINE, color: STUDIOS_INK }}
                autoComplete="name"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: STUDIOS_MUTED }}>
                Email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                style={{ borderColor: STUDIOS_LINE, color: STUDIOS_INK }}
                autoComplete="email"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: STUDIOS_MUTED }}>
                Message <span className="font-normal normal-case">(optional)</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
                style={{ borderColor: STUDIOS_LINE, color: STUDIOS_INK }}
                placeholder="Goals, timing, or questions…"
              />
            </label>
            <button
              type="submit"
              className="mt-6 w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-95"
              style={{ background: STUDIOS_INK }}
            >
              Send request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
