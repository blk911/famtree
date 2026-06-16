"use client";

import { useEffect, useState } from "react";
import { SalonOfferClientPreview } from "@/components/vmb/salon/SalonOfferClientPreview";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";

export function SalonOfferClaimClient({
  offerId,
  salonId,
  salonName,
}: {
  offerId: string;
  salonId?: string;
  salonName: string;
}) {
  const [display, setDisplay] = useState<ResolvedSalonOfferDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!salonId) {
      setLoading(false);
      setError("This offer isn't available right now.");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/vmb/salon-offers/${encodeURIComponent(offerId)}`);
        if (!res.ok) throw new Error("Offer not found");
        const json = (await res.json()) as { display?: ResolvedSalonOfferDisplay };
        if (!json.display) throw new Error("This offer isn't available right now.");
        setDisplay(json.display);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [offerId, salonId]);

  return (
    <div className="vmb-offer-claim">
      {salonName ? <p className="vmb-offer-claim__salon">{salonName}</p> : null}
      {loading ? (
        <p className="vmb-offer-claim__state">Loading offer…</p>
      ) : error || !display ? (
        <p className="vmb-offer-claim__state vmb-offer-claim__state--error">
          {error ?? "This offer isn't available right now."}
        </p>
      ) : claimed ? (
        <div className="vmb-offer-claim__confirmed">
          <p>Offer saved — login, payment, and booking wiring comes next.</p>
        </div>
      ) : (
        <SalonOfferClientPreview
          offer={display}
          variant="client"
          onClaim={() => setClaimed(true)}
        />
      )}
    </div>
  );
}
