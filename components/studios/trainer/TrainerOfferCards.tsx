"use client";

import { useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import type { StudioOffer } from "@/types/studios";
import { OFFER_PACKAGE_LABELS } from "@/types/studios";
import { formatStudioOfferPrice } from "@/lib/studios/mockStudios";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";
import { OfferRequestModal } from "./OfferRequestModal";
import { useApplyStudioLiveName } from "./ApplyStudioLiveNameContext";

type Props = {
  providerName: string;
  offers: StudioOffer[];
  previewMode?: boolean;
  /** Wide 4-column grid on large screens (studio apply preview). */
  gridColumns?: "auto" | "four";
};

export function TrainerOfferCards({
  providerName,
  offers,
  previewMode = false,
  gridColumns = "auto",
}: Props) {
  const resolvedProviderName = useApplyStudioLiveName(providerName);
  const [selected, setSelected] = useState<StudioOffer | null>(null);
  const [open, setOpen] = useState(false);

  if (offers.length === 0) {
    return (
      <div
        style={{
          padding: "28px",
          borderRadius: "20px",
          background: "#fafafa",
          border: `1px dashed ${STUDIOS_LINE}`,
          color: STUDIOS_MUTED,
          fontSize: "15px",
          textAlign: "center",
        }}
      >
        Services coming soon. Check back or reach out through AIH Studios support.
      </div>
    );
  }

  return (
    <>
      <div
        style={
          gridColumns === "four"
            ? undefined
            : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" }
        }
        className={
          gridColumns === "four"
            ? "grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4"
            : undefined
        }
      >
        {offers.map((offer) => (
          <button
            key={offer.id}
            type="button"
            onClick={() => {
              setSelected(offer);
              setOpen(true);
            }}
            style={{
              textAlign: "left",
              padding: "22px",
              borderRadius: "20px",
              background: "#fff",
              border: `1px solid ${STUDIOS_LINE}`,
              boxShadow: STUDIOS_CARD_SHADOW,
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
            className="group hover:-translate-y-0.5"
          >
            <span
              style={{
                alignSelf: "flex-start",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#b8956c",
                background: "rgba(201, 166, 107, 0.12)",
                padding: "4px 10px",
                borderRadius: "999px",
              }}
            >
              {OFFER_PACKAGE_LABELS[offer.packageType]}
            </span>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: STUDIOS_INK, margin: 0, letterSpacing: "-0.02em" }}>
              {offer.title}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.55, color: STUDIOS_MUTED, margin: 0, flex: 1 }}>
              {offer.description}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, color: STUDIOS_INK }}>{formatStudioOfferPrice(offer)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", color: STUDIOS_MUTED }}>
                <Clock style={{ width: "14px", height: "14px" }} />
                {offer.durationMinutes} min
              </span>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 600,
                color: STUDIOS_INK,
                marginTop: "4px",
              }}
            >
              {previewMode ? "Preview request flow" : "Request service"}{" "}
              <ArrowRight style={{ width: "15px", height: "15px" }} className="transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      <OfferRequestModal
        open={open}
        onClose={() => {
          setOpen(false);
          setSelected(null);
        }}
        offer={selected}
        providerName={resolvedProviderName}
        previewMode={previewMode}
      />
    </>
  );
}
