"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import type { PersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";

export type EditableCardPatch = Partial<
  Pick<CardPreviewModel, "salutation" | "title" | "subtitle" | "body" | "cta" | "techName" | "salonDisplayName">
> & {
  inviteCopy?: Partial<PersonalInviteCopy>;
};

function mergeInviteCopy(
  current: PersonalInviteCopy | undefined,
  patch: Partial<PersonalInviteCopy>,
): PersonalInviteCopy {
  const base: PersonalInviteCopy = current ?? {
    greeting: "",
    personalConnection: "",
    inviteMessage: "",
    offerMessage: "",
    signature: "",
    primaryCta: "",
    secondaryCta: "",
  };
  return { ...base, ...patch };
}

export function useEditableCardDraft(initial: CardPreviewModel) {
  const [draft, setDraft] = useState(initial);
  const snapshotRef = useRef(initial);

  useEffect(() => {
    setDraft(initial);
    snapshotRef.current = initial;
  }, [initial]);

  const patchDraft = useCallback((patch: EditableCardPatch) => {
    setDraft((current) => {
      const { inviteCopy: invitePatch, ...rest } = patch;
      const next: CardPreviewModel = { ...current, ...rest };
      if (invitePatch) {
        next.inviteCopy = mergeInviteCopy(current.inviteCopy, invitePatch);
        next.salutation = next.inviteCopy.greeting;
        next.cta = next.inviteCopy.primaryCta;
        next.body = [
          next.inviteCopy.personalConnection,
          next.inviteCopy.inviteMessage,
          next.inviteCopy.offerMessage,
        ]
          .filter(Boolean)
          .join("\n\n");
      }
      return next;
    });
  }, []);

  const snapshotDraft = useCallback(() => {
    snapshotRef.current = draft;
  }, [draft]);

  const restoreDraft = useCallback(() => {
    setDraft(snapshotRef.current);
  }, []);

  return { draft, patchDraft, snapshotDraft, restoreDraft };
}
