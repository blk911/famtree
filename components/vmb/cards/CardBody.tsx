"use client";

import { useState } from "react";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
  editable?: boolean;
  onChange?: (patch: Partial<Pick<CardPreviewModel, "title" | "subtitle" | "body" | "cta">>) => void;
};

export function CardBody({ model, editable, onChange }: Props) {
  const [title, setTitle] = useState(model.title);
  const [subtitle, setSubtitle] = useState(model.subtitle);
  const [body, setBody] = useState(model.body);
  const [cta, setCta] = useState(model.cta);

  function emit(field: "title" | "subtitle" | "body" | "cta", value: string) {
    if (field === "title") setTitle(value);
    if (field === "subtitle") setSubtitle(value);
    if (field === "body") setBody(value);
    if (field === "cta") setCta(value);
    onChange?.({ [field]: value });
  }

  return (
    <div className="vmb-card-preview__body">
      <p className="vmb-card-preview__salutation">{model.salutation}</p>

      {editable ? (
        <>
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--title"
            value={title}
            onChange={(e) => emit("title", e.target.value)}
            aria-label="Card title"
          />
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--subtitle"
            value={subtitle}
            onChange={(e) => emit("subtitle", e.target.value)}
            aria-label="Card subtitle"
          />
          <textarea
            className="vmb-card-preview__edit vmb-card-preview__edit--body"
            value={body}
            rows={4}
            onChange={(e) => emit("body", e.target.value)}
            aria-label="Card body"
          />
          <input
            className="vmb-card-preview__edit vmb-card-preview__edit--cta"
            value={cta}
            onChange={(e) => emit("cta", e.target.value)}
            aria-label="Call to action"
          />
        </>
      ) : (
        <>
          <h3 className="vmb-card-preview__title">{title}</h3>
          <p className="vmb-card-preview__subtitle">{subtitle}</p>
          <p className="vmb-card-preview__copy">{body}</p>
          <p className="vmb-card-preview__cta">{cta}</p>
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
