// lib/studios/creator-lab/hashtag-harvest/classifiers/salon.ts
// Salon / Client-Centric vertical classifier.
// Primary types map to beauty service categories.
// Secondary types map to the operator's role (takes bookings, student, educator, community).

import type { VerticalClassification } from "./types";

// ─── Primary types ────────────────────────────────────────────────────────────

export type SalonPrimaryType =
  | "hair"
  | "nails"
  | "lashes_brows"
  | "skin_esthetics"
  | "makeup"
  | "massage"
  | "tattoo_piercing"
  | "medical_aesthetics"
  | "salon_suite"
  | "beauty_school"
  | "general_beauty"
  | "unknown";

export const SALON_PRIMARY_LABELS: Record<SalonPrimaryType, string> = {
  hair:               "Hair",
  nails:              "Nails",
  lashes_brows:       "Lashes & Brows",
  skin_esthetics:     "Skin & Esthetics",
  makeup:             "Makeup",
  massage:            "Massage",
  tattoo_piercing:    "Tattoo & Piercing",
  medical_aesthetics: "Medical Aesthetics",
  salon_suite:        "Salon Suite",
  beauty_school:      "Beauty School",
  general_beauty:     "General Beauty",
  unknown:            "Unknown",
};

// ─── Secondary types ──────────────────────────────────────────────────────────

export type SalonSecondaryType = "operator" | "student" | "educator" | "community" | "unknown";

export const SALON_SECONDARY_LABELS: Record<SalonSecondaryType, string> = {
  operator:  "Operator",
  student:   "Student",
  educator:  "Educator",
  community: "Community",
  unknown:   "Unknown",
};

// ─── Hashtag clusters (preset panel) ─────────────────────────────────────────

export const SALON_HASHTAG_CLUSTERS: Record<string, string[]> = {
  "HAIR": [
    "hairstylist", "haircolorist", "balayage", "highlights", "hairextensions",
    "keratin", "blondespecialist", "hairsalon", "behindthechair", "hairdresser",
    "curtainbangs", "frenchbob", "blowout", "haircut",
  ],
  "NAILS": [
    "nailtech", "nailartist", "nails", "nailart", "gelnails", "acrylicnails",
    "manicure", "pedicure", "nailsalon", "pressonnails", "naildesign",
    "nailstagram", "nailsofinstagram",
  ],
  "LASHES & BROWS": [
    "lashtech", "lashes", "lashextensions", "lashlift", "volumelashes",
    "russianvolume", "lashartist", "microblading", "browstylist",
    "browlamination", "phibrows",
  ],
  "SKIN & ESTHETICS": [
    "esthetician", "esthetics", "facialist", "skincare", "skintherapist",
    "dermaplaning", "chemicalpeel", "waxing",
  ],
  "MAKEUP": [
    "mua", "makeupartist", "makeupartists", "bridalmakeup", "makeuptransformation",
  ],
  "MASSAGE": [
    "massagetherapist", "massagetherapy", "bodywork", "deeptissue", "sportsmassage", "reiki",
  ],
  "TATTOO & PIERCING": [
    "tattoo", "tattooist", "tattooartist", "fineline", "minimalisttattoo", "piercing",
  ],
  "MEDICAL AESTHETICS": [
    "injector", "aestheticnurse", "medaesthetics", "aestheticmedicine",
    "botox", "fillers", "dysport", "lipfiller",
  ],
  "SALON SUITE / BOOTH": [
    "salonsuite", "salonowner", "salonlife", "suitelife",
    "boothrenter", "independentstylist", "boothrent",
  ],
  "BEAUTY SCHOOL": [
    "cosmetologyschool", "cosmetologystudent", "beautyschool",
    "estheticsprogram", "beautyacademy",
  ],
};

export const SALON_HASHTAG_PRESET: string[] = Object.values(SALON_HASHTAG_CLUSTERS).flat();

// ─── Hashtag → primary type map ───────────────────────────────────────────────

const HASHTAG_TO_SALON_TYPE: Record<string, SalonPrimaryType> = {
  // Hair
  hairstylist: "hair", haircolorist: "hair", balayage: "hair",
  highlights: "hair", hairextensions: "hair", keratin: "hair",
  blondespecialist: "hair", hairsalon: "hair", behindthechair: "hair",
  hairdresser: "hair", haircut: "hair", blowout: "hair",
  curtainbangs: "hair", frenchbob: "hair",
  // Nails
  nailtech: "nails", nailartist: "nails", nails: "nails", nailart: "nails",
  gelnails: "nails", acrylicnails: "nails", manicure: "nails", pedicure: "nails",
  nailsalon: "nails", pressonnails: "nails", naildesign: "nails",
  nailstagram: "nails", nailsofinstagram: "nails",
  // Lashes & Brows
  lashtech: "lashes_brows", lashes: "lashes_brows", lashextensions: "lashes_brows",
  lashlift: "lashes_brows", volumelashes: "lashes_brows", russianvolume: "lashes_brows",
  lashartist: "lashes_brows", microblading: "lashes_brows", browstylist: "lashes_brows",
  browlamination: "lashes_brows", phibrows: "lashes_brows",
  // Skin & Esthetics
  esthetician: "skin_esthetics", esthetics: "skin_esthetics", facialist: "skin_esthetics",
  skintherapist: "skin_esthetics", dermaplaning: "skin_esthetics",
  chemicalpeel: "skin_esthetics", waxing: "skin_esthetics", skincare: "skin_esthetics",
  // Makeup
  mua: "makeup", makeupartist: "makeup", makeupartists: "makeup",
  bridalmakeup: "makeup", makeuptransformation: "makeup",
  // Massage
  massagetherapist: "massage", massagetherapy: "massage", bodywork: "massage",
  deeptissue: "massage", sportsmassage: "massage", reiki: "massage",
  // Tattoo & Piercing
  tattoo: "tattoo_piercing", tattooist: "tattoo_piercing", tattooartist: "tattoo_piercing",
  fineline: "tattoo_piercing", minimalisttattoo: "tattoo_piercing", piercing: "tattoo_piercing",
  // Medical Aesthetics
  injector: "medical_aesthetics", aestheticnurse: "medical_aesthetics",
  medaesthetics: "medical_aesthetics", aestheticmedicine: "medical_aesthetics",
  botox: "medical_aesthetics", fillers: "medical_aesthetics",
  dysport: "medical_aesthetics", lipfiller: "medical_aesthetics",
  // Salon Suite / Booth
  salonsuite: "salon_suite", salonowner: "salon_suite", salonlife: "salon_suite",
  suitelife: "salon_suite", boothrenter: "salon_suite",
  independentstylist: "salon_suite", boothrent: "salon_suite",
  // Beauty School
  cosmetologyschool: "beauty_school", cosmetologystudent: "beauty_school",
  beautyschool: "beauty_school", estheticsprogram: "beauty_school",
  beautyacademy: "beauty_school",
  // General
  salon: "general_beauty", beautyspace: "general_beauty",
  beautystudio: "general_beauty",
};

// ─── Secondary type signal lists ──────────────────────────────────────────────

const OPERATOR_SIGNALS = [
  "book now", "book me", "booking", "appointment", "appointments",
  "accepting new clients", "new clients welcome", "dms open",
  "link in bio to book", "glossgenius", "styleseat", "vagaro",
  "square", "fresha", "schedulicity",
];

const STUDENT_SIGNALS = [
  "cosmetology student", "esthetics student", "beauty school",
  "in school", "working on my license", "just licensed",
  "student at", "currently enrolled",
];

const EDUCATOR_SIGNALS = [
  "class", "course", "teach", "teaching", "online class",
  "masterclass", "workshop", "mentorship", "mentoring",
  "train ", "training others",
];

// ─── Classifier ───────────────────────────────────────────────────────────────

export function classifySalon(
  hashtag: string,
  caption: string,
  fullText: string,
): VerticalClassification {
  const tag  = hashtag.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9]/g, "");
  const text = fullText.toLowerCase();
  const signals: string[] = [];

  // Primary type: hashtag lookup first, then text scan fallback
  let primaryType: SalonPrimaryType = HASHTAG_TO_SALON_TYPE[tag] ?? "unknown";

  if (primaryType === "unknown") {
    if (/\bhair(stylist|color|cut|salon|dresser|extension)?\b/.test(text))           primaryType = "hair";
    else if (/\bnail(tech|artist|art|salon|s)?\b/.test(text))                        primaryType = "nails";
    else if (/\blash(tech|es|artist|extension|lift)?\b/.test(text) || text.includes("microblad") || text.includes("brow lamination")) primaryType = "lashes_brows";
    else if (/\b(esthetician|esthetics|facialist|dermaplaning|wax(ing)?)\b/.test(text)) primaryType = "skin_esthetics";
    else if (/\b(mua|makeup artist|makeupartist)\b/.test(text))                      primaryType = "makeup";
    else if (/\b(massage therapist|massagetherapy|bodywork)\b/.test(text))           primaryType = "massage";
    else if (/\b(tattoo(ist|artist)?|piercing)\b/.test(text))                        primaryType = "tattoo_piercing";
    else if (/\b(injector|botox|filler|aesthetic nurse)\b/.test(text))              primaryType = "medical_aesthetics";
    else if (/\b(salon suite|booth rent|suite life|salon owner)\b/.test(text))       primaryType = "salon_suite";
    else if (/\b(cosmetology school|beauty school|esthetics program)\b/.test(text))  primaryType = "beauty_school";
    else if (/\b(salon|beauty|spa)\b/.test(text))                                    primaryType = "general_beauty";
  }

  if (primaryType !== "unknown") signals.push(`type:${primaryType}`);

  // Secondary type: student > educator > operator > community
  let secondaryType: SalonSecondaryType = "unknown";

  if (STUDENT_SIGNALS.some(s => text.includes(s))) {
    secondaryType = "student";
    signals.push("signal:student");
  } else if (EDUCATOR_SIGNALS.some(s => text.includes(s))) {
    secondaryType = "educator";
    signals.push("signal:educator");
  } else if (OPERATOR_SIGNALS.some(s => text.includes(s))) {
    secondaryType = "operator";
    signals.push("signal:operator");
  } else if (primaryType !== "unknown") {
    secondaryType = "community";
    signals.push("signal:community");
  }

  return {
    primaryType,
    secondaryType,
    primaryLabel:  SALON_PRIMARY_LABELS[primaryType]    ?? primaryType,
    secondaryLabel: SALON_SECONDARY_LABELS[secondaryType] ?? secondaryType,
    signals,
  };
}
