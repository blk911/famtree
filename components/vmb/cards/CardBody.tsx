"use client";

import { useEffect, useState } from "react";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
  editable?: boolean;
  onChange?: (patch: Partial<Pick<CardPreviewModel, "salutation" | "title" | "subtitle" | "body" | "cta">>) => void;
};

export function CardBody({ model, editable, onChange }: Props) {
  const [title, setTitle] = useState(model.title);
  const [subtitle, setSubtitle] = useState(model.subtitle);
  const [body, setBody] = useState(model.body);
  const [cta, setCta] = useState(model.cta);
  const [salutation, setSalutation] = useState(model.salutation);

  useEffect(() => {
    if (!editable) {
      setTitle(model.title);
      setSubtitle(model.subtitle);
      setBody(model.body);
      setCta(model.cta);
      setSalutation(model.salutation);
    }
  }, [model, editable]);

  function emit(
    field: "salutation" | "title" | "subtitle" | "body" | "cta",
    value: string,
  ) {
    if (field === "salutation") setSalutation(value);
    if (field === "title") setTitle(value);
    if (field === "subtitle") setSubtitle(value);
    if (field === "body") setBody(value);
    if (field === "cta") setCta(value);
    onChange?.({ [field]: value });
  }

  const displayTitle = editable ? title : model.title;
  const displaySubtitle = editable ? subtitle : model.subtitle;
  const displayBody = editable ? body : model.body;
  const displayCta = editable ? cta : model.cta;
  const displaySalutation = editable ? salutation : model.salutation;

  return (
    <div className="vmb-card-preview__body">
      {editable ? (
        <input
          className="vmb-card-preview__edit vmb-card-preview__edit--salutation"
          value={displaySalutation}
          onChange={(e) => emit("salutation", e.target.value)}
          aria-label="Card greeting"
        />
      ) : (
        <p className="vmb-card-preview__salutation">{displaySalutation}</p>
      )}

      {editable ? (
        <>
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--title"
            value={displayTitle}
            onChange={(e) => emit("title", e.target.value)}
            aria-label="Card title"
          />
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--subtitle"
            value={displaySubtitle}
            onChange={(e) => emit("subtitle", e.target.value)}
            aria-label="Card subtitle"
          />
          <textarea
            className="vmb-card-preview__edit vmb-card-preview__edit--body"
            value={displayBody}
            rows={4}
            onChange={(e) => emit("body", e.target.value)}
            aria-label="Card body"
          />
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--cta"
            value={displayCta}
            onChange={(e) => emit("cta", e.target.value)}
            aria-label="Call to action"
          />
        </>
      ) : (
        <>
          <h3 className="vmb-card-preview__title">{displayTitle}</h3>
          <p className="vmb-card-preview__subtitle">{displaySubtitle}</p>
          <p className="vmb-card-preview__copy">{displayBody}</p>
          <p className="vmb-card-preview__cta">{displayCta}</p>
        </>
      )}

      {model.tags.length > 1 ? (
        <div className="vmb-card-preview__tags" aria-label="Card tags">
          {model.tags.map((tag) => (
            <span key={tag} className="vmb-card-preview__tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
