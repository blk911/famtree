"use client";



import { useRef, type ChangeEvent, type DragEvent, type MouseEvent } from "react";

import {

  CARD_BUILDER_IMAGE_SLOT_LABELS,

  isCardBuilderImageFile,

  type CardBuilderDraftImageSlot,

} from "@/lib/vmb/card-templates/card-builder-preview-images";



type Props = {

  slots: CardBuilderDraftImageSlot[];

  onChange: (slots: CardBuilderDraftImageSlot[]) => void;

};



export function CardBuilderImageSlots({ slots, onChange }: Props) {

  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);



  function updateSlot(index: number, patch: Partial<CardBuilderDraftImageSlot>) {
    onChange(
      slots.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot;
        const next: CardBuilderDraftImageSlot = { ...slot, ...patch };
        if (patch.previewUrl?.startsWith("blob:")) {
          next.prefilled = false;
        }
        if (patch.previewUrl === undefined && "previewUrl" in patch) {
          delete next.prefilled;
        }
        return next;
      }),
    );
  }



  function revokePreviewUrl(url?: string) {

    if (url?.startsWith("blob:")) {

      URL.revokeObjectURL(url);

    }

  }



  function applyFile(index: number, file: File) {

    if (!isCardBuilderImageFile(file)) return;



    revokePreviewUrl(slots[index]?.previewUrl);

    updateSlot(index, {

      previewUrl: URL.createObjectURL(file),

      fileName: file.name,

    });

  }



  function handleFileChange(index: number, event: ChangeEvent<HTMLInputElement>) {

    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    applyFile(index, file);

  }



  function handleDrop(index: number, event: DragEvent<HTMLDivElement>) {

    event.preventDefault();

    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    applyFile(index, file);

  }



  function handleDragOver(event: DragEvent<HTMLDivElement>) {

    event.preventDefault();

    event.dataTransfer.dropEffect = "copy";

  }



  function handleRemove(index: number, event: MouseEvent) {

    event.stopPropagation();

    revokePreviewUrl(slots[index]?.previewUrl);

    updateSlot(index, { previewUrl: undefined, fileName: undefined });

  }



  function openFilePicker(index: number, event?: MouseEvent) {

    event?.stopPropagation();

    fileInputs.current[index]?.click();

  }



  return (

    <section className="vmb-card-builder__section" aria-labelledby="card-builder-images-heading">

      <div className="vmb-card-builder__section-head">

        <h3 id="card-builder-images-heading" className="vmb-card-builder__section-title">

          Card images

        </h3>

        <p className="vmb-card-builder__section-note">

          Add 1–2 service images and an optional owner photo. These personalize the card preview.

          Preview only — upload storage coming soon.

        </p>

      </div>



      <div className="vmb-card-builder__image-grid">

        {slots.map((slot, index) => {

          const label = CARD_BUILDER_IMAGE_SLOT_LABELS[index] ?? `Slot ${index + 1}`;

          const isOwnerSlot = index === 2;



          return (

            <div

              key={`card-image-slot-${index + 1}`}

              className={`vmb-card-builder__image-slot${isOwnerSlot ? " vmb-card-builder__image-slot--owner" : ""}`}

            >

              <p className="vmb-card-builder__image-slot-label">{label}</p>

              {isOwnerSlot ? (

                <p className="vmb-card-builder__image-slot-hint">Personal sender / salon owner photo</p>

              ) : null}

              <div

                className={`vmb-card-builder__image-drop${slot.previewUrl ? " vmb-card-builder__image-drop--filled" : ""}${isOwnerSlot ? " vmb-card-builder__image-drop--owner" : ""}`}

                role="button"

                tabIndex={0}

                aria-label={slot.previewUrl ? `Replace ${label}` : `Choose ${label}`}

                onClick={() => openFilePicker(index)}

                onKeyDown={(event) => {

                  if (event.key === "Enter" || event.key === " ") {

                    event.preventDefault();

                    openFilePicker(index);

                  }

                }}

                onDragOver={handleDragOver}

                onDrop={(event) => handleDrop(index, event)}

              >

                {slot.previewUrl ? (

                  // eslint-disable-next-line @next/next/no-img-element

                  <img

                    src={slot.previewUrl}

                    alt={slot.fileName ? `${label}: ${slot.fileName}` : label}

                    className={`vmb-card-builder__image-preview${isOwnerSlot ? " vmb-card-builder__image-preview--owner" : ""}`}

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

                  onClick={(event) => openFilePicker(index, event)}

                >

                  {slot.previewUrl ? "Replace" : "Choose image"}

                </button>

                {slot.previewUrl ? (

                  <button

                    type="button"

                    className="vmb-card-builder__image-btn vmb-card-builder__image-btn--ghost"

                    onClick={(event) => handleRemove(index, event)}

                  >

                    Remove

                  </button>

                ) : null}

              </div>

            </div>

          );

        })}

      </div>

    </section>

  );

}


