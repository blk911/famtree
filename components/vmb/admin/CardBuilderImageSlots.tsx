"use client";

import { useRef, type ChangeEvent } from "react";
import type { CardBuilderDraftImageSlot } from "@/lib/vmb/card-templates/card-builder-preview-images";

type Props = {
  slots: CardBuilderDraftImageSlot[];
  onChange: (slots: CardBuilderDraftImageSlot[]) => void;
};

export function CardBuilderImageSlots({ slots, onChange }: Props) {
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);

  function updateSlot(index: number, patch: Partial<CardBuilderDraftImageSlot>) {
    onChange(
      slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)),
    );
  }

  function revokePreviewUrl(url?: string) {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  function handleFileChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    revokePreviewUrl(slots[index]?.previewUrl);
    updateSlot(index, {
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
    });
  }

  function handleRemove(index: number) {
    revokePreviewUrl(slots[index]?.previewUrl);
    updateSlot(index, { previewUrl: undefined, fileName: undefined });
  }

  return (
    <section className="vmb-card-builder__section" aria-labelledby="card-builder-images-heading">
      <div className="vmb-card-builder__section-head">
        <h3 id="card-builder-images-heading" className="vmb-card-builder__section-title">
          Card images
        </h3>
        <p className="vmb-card-builder__section-note">
          Auto layout · up to 3 images · storage coming soon (draft preview only)
        </p>
      </div>

      <div className="vmb-card-builder__image-grid">
        {slots.map((slot, index) => (
          <div key={`card-image-slot-${index + 1}`} className="vmb-card-builder__image-slot">
            <p className="vmb-card-builder__image-slot-label">Slot {index + 1}</p>
            <div
              className={`vmb-card-builder__image-drop${slot.previewUrl ? " vmb-card-builder__image-drop--filled" : ""}`}
            >
              {slot.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slot.previewUrl}
                  alt={slot.fileName ? `Card image ${index + 1}: ${slot.fileName}` : `Card image ${index + 1}`}
                  className="vmb-card-builder__image-preview"
                />
              ) : (
                <p className="vmb-card-builder__image-placeholder">Drop image here</p>
              )}
            </div>
            <input
              ref={(element) => {
                fileInputs.current[index] = element;
              }}
              type="file"
              accept="image/*"
              className="vmb-card-builder__file-input"
              onChange={(event) => handleFileChange(index, event)}
            />
            <div className="vmb-card-builder__image-actions">
              <button
                type="button"
                className="vmb-card-builder__image-btn"
                onClick={() => fileInputs.current[index]?.click()}
              >
                {slot.previewUrl ? "Replace" : "Choose image"}
              </button>
              {slot.previewUrl ? (
                <button
                  type="button"
                  className="vmb-card-builder__image-btn vmb-card-builder__image-btn--ghost"
                  onClick={() => handleRemove(index)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
