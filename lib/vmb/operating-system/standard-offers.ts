import type { StandardOffer } from "./types";

export function buildStandardOffers(): StandardOffer[] {
  return [
    {
      id: "offer-gel-refresh",
      name: "Gel X Refresh",
      suggestedUse: "Reactivation and lapsed client win-back",
    },
    {
      id: "offer-gloss-blowout",
      name: "Gloss + Blowout",
      suggestedUse: "VIP clients and book-your-next-appointment prompts",
    },
    {
      id: "offer-birthday",
      name: "Birthday Special",
      suggestedUse: "Birthday and celebration moments this week",
    },
    {
      id: "offer-bring-friend",
      name: "Bring A Friend Bonus",
      suggestedUse: "Referral-ready clients in your private network",
    },
  ];
}
