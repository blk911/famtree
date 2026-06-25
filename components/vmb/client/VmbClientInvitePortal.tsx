"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SalonInviteCard } from "@/components/vmb/invites/SalonInviteCard";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
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

  const tokenContext = useMemo<InviteTemplateTokenContext>(() => {
    const snapshot = invite?.snapshot;
    return {
      salonName: snapshot?.salonDisplayName ?? "Your salon",
      providerName: snapshot?.providerName ?? "Your nail tech",
      clientName: snapshot?.recipientName ?? "there",
      claimLink: "#",
    };
  }, [invite]);

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

  return (
    <main className="vmb-client-invite-page">
      <nav className="vmb-client-invite-page__nav">
        <strong>VMB</strong>
        <span>Client invite</span>
      </nav>

      {loading ? (
        <section className="vmb-client-invite-page__panel">
          <p>Finding your invite…</p>
        </section>
      ) : error ? (
        <section className="vmb-client-invite-page__panel vmb-client-invite-page__panel--error">
          <p>{error}</p>
        </section>
      ) : snapshot ? (
        <section className="vmb-client-invite-page__shell">
          <div className="vmb-client-invite-page__stack">
            <div className="vmb-client-invite-page__intro">
              <div className="vmb-client-invite-page__intro-copy">
                <p className="vmb-client-invite-page__eyebrow">Private client page</p>
                <h1 className="vmb-client-invite-page__greeting">
                  <span>Hi</span>
                  <strong>{snapshot.recipientName || "there"}</strong>
                </h1>
                <p>
                  {snapshot.providerName ?? "Your salon"} sent you a private invitation. Review the offer, then choose how
                  you want to handle it.
                </p>
              </div>
              <dl className="vmb-client-invite-page__details">
                <div>
                  <dt>Invite</dt>
                  <dd>{snapshot.inviteTypeLabel}</dd>
                </div>
                <div>
                  <dt>Salon</dt>
                  <dd>{snapshot.salonDisplayName}</dd>
                </div>
                {snapshot.expirationLabel ? (
                  <div>
                    <dt>Good through</dt>
                    <dd>{snapshot.expirationLabel.replace(/^Valid\s+/i, "")}</dd>
                  </div>
                ) : null}
              </dl>
              {notice ? <p className="vmb-client-invite-page__notice">{notice}</p> : null}
            </div>

            <div className="vmb-client-invite-page__modal-copy">
              <p className="vmb-client-invite-page__eyebrow">Action item</p>
              <h2>{snapshot.headline}</h2>
              <p>
                Claim the invite, ask the salon to adjust it, or hold it while you decide.
              </p>
              <div className="vmb-client-invite-page__mini-offer">
                {services.length > 0 ? <strong>{services.join(" · ")}</strong> : null}
                {rewards.length > 0 ? <span>{rewards.join(" · ")}</span> : null}
              </div>
              <div className="vmb-client-invite-page__actions">
                <button type="button" onClick={() => void claimInvite("book")} disabled={claiming || invite?.alreadyClaimed}>
                  {invite?.alreadyClaimed ? "Claimed" : claiming ? "Claiming…" : "Book Now"}
                </button>
                <button type="button" onClick={() => void claimInvite("revise")}>
                  Revise
                </button>
                <button type="button" onClick={() => void claimInvite("hold")}>
                  Hold
                </button>
              </div>
            </div>
          </div>

          <div className="vmb-client-invite-page__preview" role="dialog" aria-label="Client invite preview">
            <SalonInviteCard
              inviteTypeLabel={snapshot.inviteTypeLabel}
              headline={snapshot.headline}
              body={snapshot.body}
              ctaLabel={snapshot.ctaLabel}
              services={services}
              rewards={rewards}
              expirationLabel={snapshot.expirationLabel}
              ownerName={snapshot.providerName ?? "Your nail tech"}
              salonName={snapshot.salonDisplayName}
              serviceImageUrl={snapshot.serviceImageUrl}
              inviteArtImageUrl={snapshot.inviteArtImageUrl}
              mode="client"
              previewOnly
              tokenContext={tokenContext}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
