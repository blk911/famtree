// lib/intelligence/transpo/keyword-packs.ts
// Shared keyword pack config for the Transpo Source Ingest UI.
// A keyword pack is a named bundle of search keywords that can be toggled
// on/off to populate the FMCSA test pull keyword set.

export type KeywordPack = {
  id: string;
  label: string;
  keywords: string[];
  description?: string;
};

export const SOURCE_INGEST_KEYWORD_PACKS: KeywordPack[] = [
  {
    id: "reefer",
    label: "Reefer",
    keywords: ["reefer", "refrigerated", "cold chain"],
  },
  {
    id: "flatbed",
    label: "Flatbed",
    keywords: ["flatbed", "oversize", "heavy haul"],
  },
  {
    id: "owner_operator",
    label: "Owner Operator",
    keywords: ["owner operator", "lease purchase", "independent contractor"],
  },
  {
    id: "hazmat",
    label: "Hazmat",
    keywords: ["hazmat", "tanker", "dangerous goods"],
  },
  {
    id: "intermodal",
    label: "Intermodal",
    keywords: ["intermodal", "container", "drayage"],
  },
  {
    id: "last_mile",
    label: "Last Mile",
    keywords: ["last mile", "final mile", "delivery"],
  },
  {
    id: "broker",
    label: "Broker",
    keywords: ["freight broker", "brokerage", "3PL"],
  },
  {
    id: "logistics",
    label: "Logistics",
    keywords: ["logistics", "transportation", "freight"],
  },
  {
    id: "cdl_hiring",
    label: "CDL Hiring",
    keywords: ["CDL hiring", "drivers wanted", "hiring drivers"],
  },
  {
    id: "moving",
    label: "Moving",
    keywords: ["moving company", "movers", "relocation"],
  },
];
