"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

export type EditableCardPatch = Partial<
  Pick<CardPreviewModel, "salutation" | "title" | "subtitle" | "body" | "cta">
>;

export function useEditableCardDraft(initial: CardPreviewModel) {
  const [draft, setDraft] = useState(initial);
  const snapshotRef = useRef(initial);

  useEffect(() => {
    setDraft(initial);
    snapshotRef.current = initial;
  }, [initial]);

  const patchDraft = useCallback((patch: EditableCardPatch) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const snapshotDraft = useCallback(() => {
    snapshotRef.current = draft;
  }, [draft]);

  const restoreDraft = useCallback(() => {
    setDraft(snapshotRef.current);
  }, []);

  return { draft, patchDraft, snapshotDraft, restoreDraft };
}
