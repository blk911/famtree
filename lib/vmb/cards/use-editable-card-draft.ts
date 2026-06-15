"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

import type { PersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";

import type { CardPreviewOffer } from "@/lib/vmb/offers/offer-types";



export type EditableCardPatch = Partial<

  Pick<
    CardPreviewModel,
    "salutation" | "title" | "subtitle" | "body" | "cta" | "techName" | "salonDisplayName" | "includeOffer" | "relationshipBenefit" | "signatureLine" | "templateOfferLine"
  >
> & {

  inviteCopy?: Partial<PersonalInviteCopy>;

  offer?: Partial<CardPreviewOffer>;

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



function mergeOffer(current: CardPreviewOffer | undefined, patch: Partial<CardPreviewOffer>): CardPreviewOffer {

  const base: CardPreviewOffer = current ?? {

    id: "local-offer",

    name: "Offer",

    offerText: "",

    category: "service",

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

      const { inviteCopy: invitePatch, offer: offerPatch, ...rest } = patch;

      const next: CardPreviewModel = { ...current, ...rest };

      if (offerPatch) {

        next.offer = mergeOffer(current.offer, offerPatch);

        if (next.inviteCopy) {

          next.inviteCopy = {

            ...next.inviteCopy,

            offerMessage: next.offer.offerText,

          };

        }

      }

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

        if (next.offer && invitePatch.offerMessage !== undefined) {

          next.offer = { ...next.offer, offerText: invitePatch.offerMessage };

        }

      }

      if (rest.includeOffer === false) {

        next.offer = undefined;

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



  const replaceDraft = useCallback((next: CardPreviewModel) => {

    setDraft(next);

    snapshotRef.current = next;

  }, []);



  return { draft, patchDraft, snapshotDraft, restoreDraft, replaceDraft };

}

