import type {
  ServicePhotoAsset,
  ServicePhotoCategory,
  ServicePhotoMood,
  ServicePhotoNailLength,
  ServicePhotoShotType,
  ServicePhotoStyle,
} from "./service-image-types";



type AssetSeed = {

  id: string;

  category: ServicePhotoCategory;

  title: string;

  unsplashId?: string;

  pexelsId?: number;

  photographer: string;

  sourceName: "Unsplash" | "Pexels";

  sourceUrl: string;

  tags: string[];

  featured?: boolean;
  mood?: ServicePhotoMood;
  shotType?: ServicePhotoShotType;
  nailLength?: ServicePhotoNailLength;
  style?: ServicePhotoStyle;

};



function unsplashUrl(id: string, width = 800): string {

  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

}



function pexelsUrl(id: number, width = 800): string {

  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

}



function buildAsset(seed: AssetSeed): ServicePhotoAsset {

  const imageUrl = seed.unsplashId

    ? unsplashUrl(seed.unsplashId)

    : pexelsUrl(seed.pexelsId!);



  return {

    id: seed.id,

    category: seed.category,

    title: seed.title,

    imageUrl,

    thumbnailUrl: seed.unsplashId

      ? unsplashUrl(seed.unsplashId, 240)

      : pexelsUrl(seed.pexelsId!, 240),

    photographer: seed.photographer,

    sourceName: seed.sourceName,

    sourceUrl: seed.sourceUrl,

    tags: seed.tags,

    active: true,

    featured: seed.featured,
    mood: seed.mood,
    shotType: seed.shotType,
    nailLength: seed.nailLength,
    style: seed.style,

  };

}



const SHORT_GEL_PINK = "1604654894610-df63bc536371";

const SHORT_GEL_NEUTRAL = "1632345031435-8727f6897d53";

const LONG_EXTENSION_SET = "1777287852750-53eb2ca506e9";



const ASSET_SEEDS: AssetSeed[] = [

  // gel_manicure (8) — short/natural gel polish only

  {

    id: "gel-manicure-001",

    category: "gel_manicure",

    title: "Soft pink gel manicure",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["gel", "manicure", "pink", "polish"],

    featured: true,

  },

  {

    id: "gel-manicure-002",

    category: "gel_manicure",

    title: "Neutral gel polish finish",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["gel", "manicure", "neutral", "polish"],

  },

  {

    id: "gel-manicure-003",

    category: "gel_manicure",

    title: "Pastel gel manicure detail",

    pexelsId: 3997985,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",

    tags: ["gel", "manicure", "pastel", "polish"],

  },

  {

    id: "gel-manicure-004",

    category: "gel_manicure",

    title: "Classic nude gel manicure",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["gel", "manicure", "nude", "polish"],

  },

  {

    id: "gel-manicure-005",

    category: "gel_manicure",

    title: "Glossy rose gel manicure",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["gel", "manicure", "glossy", "polish"],

  },

  {

    id: "gel-manicure-006",

    category: "gel_manicure",

    title: "Clean short gel manicure",

    pexelsId: 3997985,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",

    tags: ["gel", "manicure", "short", "polish"],

  },

  {

    id: "gel-manicure-007",

    category: "gel_manicure",

    title: "Sheer gel manicure finish",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["gel", "manicure", "sheer", "polish"],

  },

  {

    id: "gel-manicure-008",

    category: "gel_manicure",

    title: "Minimal gel manicure styling",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["gel", "manicure", "minimal", "polish"],

  },



  // builder_gel (6) — natural overlay / strengthening / application

  {

    id: "builder-gel-001",

    category: "builder_gel",

    title: "Builder gel overlay finish",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["builder", "overlay", "strengthening", "natural"],

    featured: true,

  },

  {

    id: "builder-gel-002",

    category: "builder_gel",

    title: "Natural builder gel nails",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["builder", "overlay", "natural", "nails"],

  },

  {

    id: "builder-gel-003",

    category: "builder_gel",

    title: "Builder gel shaping application",

    pexelsId: 3685530,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",

    tags: ["builder", "application", "overlay", "salon"],

  },

  {

    id: "builder-gel-004",

    category: "builder_gel",

    title: "Builder gel strengthening session",

    pexelsId: 3997386,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",

    tags: ["builder", "strengthening", "application", "salon"],

  },

  {

    id: "builder-gel-005",

    category: "builder_gel",

    title: "Builder gel cure and finish",

    pexelsId: 4677850,

    photographer: "Leeloo The First",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-professional-manicure-4677850/",

    tags: ["builder", "overlay", "application", "gel"],

  },

  {

    id: "builder-gel-006",

    category: "builder_gel",

    title: "Soft builder gel overlay",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["builder", "overlay", "soft", "natural"],

  },



  // structured_gel (6) — structured natural overlay, not generic polish

  {

    id: "structured-gel-001",

    category: "structured_gel",

    title: "Structured gel architecture",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["structured", "overlay", "architecture", "gel"],

    featured: true,

  },

  {

    id: "structured-gel-002",

    category: "structured_gel",

    title: "Sculpted structured gel overlay",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["structured", "sculpted", "overlay", "gel"],

  },

  {

    id: "structured-gel-003",

    category: "structured_gel",

    title: "Structured gel shaping application",

    pexelsId: 3685530,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",

    tags: ["structured", "application", "overlay", "salon"],

  },

  {

    id: "structured-gel-004",

    category: "structured_gel",

    title: "Defined structured gel overlay",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["structured", "defined", "overlay", "gel"],

  },

  {

    id: "structured-gel-005",

    category: "structured_gel",

    title: "Structured gel builder finish",

    pexelsId: 4677850,

    photographer: "Leeloo The First",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-professional-manicure-4677850/",

    tags: ["structured", "overlay", "application", "gel"],

  },

  {

    id: "structured-gel-006",

    category: "structured_gel",

    title: "Structured gel salon finish",

    pexelsId: 3685530,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",

    tags: ["structured", "sculpted", "overlay", "salon"],

  },



  // gel_x (6) — extensions / long nail set / full set only

  {

    id: "gel-x-001",

    category: "gel_x",

    title: "Gel-X extension full set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "extensions", "full-set", "long"],

    featured: true,

  },

  {

    id: "gel-x-002",

    category: "gel_x",

    title: "Soft gel-X almond extensions",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "extensions", "long", "almond"],

  },

  {

    id: "gel-x-003",

    category: "gel_x",

    title: "Long gel-X stiletto set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "long", "extensions", "stiletto"],

  },

  {

    id: "gel-x-004",

    category: "gel_x",

    title: "Gel-X length extension set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "extensions", "long", "full-set"],

  },

  {

    id: "gel-x-005",

    category: "gel_x",

    title: "Gel-X natural extension look",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "extensions", "long", "natural"],

  },

  {

    id: "gel-x-006",

    category: "gel_x",

    title: "Gel-X glossy extension finish",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["gel-x", "extensions", "long", "glossy"],

  },



  // acrylic (6) — acrylic extensions / long sculpted nails only

  {

    id: "acrylic-001",

    category: "acrylic",

    title: "Acrylic extension full set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "extensions", "full-set", "long"],

    featured: true,

  },

  {

    id: "acrylic-002",

    category: "acrylic",

    title: "Classic long acrylic nails",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "extensions", "long", "classic"],

  },

  {

    id: "acrylic-003",

    category: "acrylic",

    title: "Sculpted acrylic extension set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "extensions", "sculpted", "long"],

  },

  {

    id: "acrylic-004",

    category: "acrylic",

    title: "French acrylic extensions",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "extensions", "long", "french"],

  },

  {

    id: "acrylic-005",

    category: "acrylic",

    title: "Acrylic full set",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "full-set", "extensions", "long"],

  },

  {

    id: "acrylic-006",

    category: "acrylic",

    title: "Sculpted acrylic finish",

    unsplashId: LONG_EXTENSION_SET,

    photographer: "de Aura",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/womans-hands-with-long-ornate-red-and-white-stiletto-nails-NtDhTLXEonc",

    tags: ["acrylic", "extensions", "sculpted", "long"],

  },



  // pedicure (6) — feet / spa pedicure only

  {

    id: "pedicure-001",

    category: "pedicure",

    title: "Smart pedicure soak",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "soak", "spa"],

    featured: true,

  },

  {

    id: "pedicure-002",

    category: "pedicure",

    title: "Spa pedicure treatment",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "spa", "relax"],

  },

  {

    id: "pedicure-003",

    category: "pedicure",

    title: "Pedicure foot care",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "care", "spa"],

  },

  {

    id: "pedicure-004",

    category: "pedicure",

    title: "Salon pedicure service",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "salon", "spa"],

  },

  {

    id: "pedicure-005",

    category: "pedicure",

    title: "Polished pedicure finish",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "polish", "finish"],

  },

  {

    id: "pedicure-006",

    category: "pedicure",

    title: "Refresh pedicure detail",

    pexelsId: 3997991,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",

    tags: ["pedicure", "feet", "refresh", "spa"],

  },



  // fill_refresh (5) — maintenance/refill/freshened nails only

  {

    id: "fill-refresh-001",

    category: "fill_refresh",

    title: "Fill and refresh maintenance",

    unsplashId: SHORT_GEL_PINK,

    photographer: "Drew Beamer",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",

    tags: ["fill", "refresh", "maintenance", "gel"],

    featured: true,

  },

  {

    id: "fill-refresh-002",

    category: "fill_refresh",

    title: "Two-week fill refresh",

    unsplashId: SHORT_GEL_NEUTRAL,

    photographer: "Micheile Henderson",

    sourceName: "Unsplash",

    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",

    tags: ["fill", "refresh", "maintenance", "two-week"],

  },

  {

    id: "fill-refresh-003",

    category: "fill_refresh",

    title: "Refresh touch-up session",

    pexelsId: 3685530,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",

    tags: ["refresh", "maintenance", "fill", "touch-up"],

  },

  {

    id: "fill-refresh-004",

    category: "fill_refresh",

    title: "Fill refresh polish update",

    pexelsId: 3997985,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",

    tags: ["fill", "refresh", "maintenance", "polish"],

  },

  {

    id: "fill-refresh-005",

    category: "fill_refresh",

    title: "Maintenance fill refresh",

    pexelsId: 4677850,

    photographer: "Leeloo The First",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-professional-manicure-4677850/",

    tags: ["maintenance", "fill", "refresh", "salon"],

  },



  // generic_salon (4) — salon atmosphere only

  {

    id: "generic-salon-001",

    category: "generic_salon",

    title: "Warm salon welcome",

    pexelsId: 3997386,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",

    tags: ["salon", "welcome", "beauty", "service"],

    featured: true,

  },

  {

    id: "generic-salon-002",

    category: "generic_salon",

    title: "Private client salon moment",

    pexelsId: 3997386,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",

    tags: ["salon", "private", "client", "service"],

  },

  {

    id: "generic-salon-003",

    category: "generic_salon",

    title: "Salon service atmosphere",

    pexelsId: 3997386,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",

    tags: ["salon", "service", "atmosphere", "beauty"],

  },

  {

    id: "generic-salon-004",

    category: "generic_salon",

    title: "Trusted beauty destination",

    pexelsId: 3997386,

    photographer: "cottonbro studio",

    sourceName: "Pexels",

    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",

    tags: ["salon", "trusted", "beauty", "destination"],

  },

];



const SOURCE_PROFILES = {
  luxeHands: {
    pexelsId: 34373406,
    photographer: "Moo Lens",
    sourceUrl: "https://www.pexels.com/photo/elegant-manicured-hands-with-gold-jewelry-34373406/",
  },
  artHands: {
    pexelsId: 29004934,
    photographer: "Mert Coskun",
    sourceUrl: "https://www.pexels.com/photo/trendy-hand-with-artistic-nail-art-on-denim-29004934/",
  },
  handCare: {
    pexelsId: 4210658,
    photographer: "Kaboompics",
    sourceUrl: "https://www.pexels.com/photo/crop-woman-with-moisturizer-on-hands-4210658/",
  },
  polishPalette: {
    pexelsId: 27913837,
    photographer: "Dmitry Ovsyannikov",
    sourceUrl: "https://www.pexels.com/photo/gel-nail-polish-with-marshmallows-and-candy-27913837/",
  },
  redLifestyle: {
    pexelsId: 6029150,
    photographer: "Kaboompics",
    sourceUrl: "https://www.pexels.com/photo/person-with-red-nails-writing-on-a-notebook-6029150/",
  },
  proManicure: {
    pexelsId: 4677850,
    photographer: "Leeloo The First",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-professional-manicure-4677850/",
  },
  redPedicure: {
    pexelsId: 6660631,
    photographer: "Kaboompics",
    sourceUrl: "https://www.pexels.com/photo/close-up-of-woman-foot-6660631/",
  },
  luxePedicure: {
    pexelsId: 7067963,
    photographer: "Vika Glitter",
    sourceUrl: "https://www.pexels.com/photo/unrecognizable-woman-legs-and-hands-in-silver-anklets-and-rings-7067963/",
  },
} satisfies Record<string, Pick<AssetSeed, "pexelsId" | "photographer" | "sourceUrl">>;

function pexelsSeed(
  profile: keyof typeof SOURCE_PROFILES,
  seed: Omit<AssetSeed, "pexelsId" | "photographer" | "sourceName" | "sourceUrl">,
): AssetSeed {
  return {
    ...seed,
    ...SOURCE_PROFILES[profile],
    sourceName: "Pexels",
  };
}

const EXTRA_ASSET_SEEDS: AssetSeed[] = [
  pexelsSeed("luxeHands", { id: "gel-manicure-009", category: "gel_manicure", title: "Elegant grey gel manicure", tags: ["gel", "manicure", "neutral", "jewelry"], mood: "luxury", shotType: "hands", nailLength: "short", style: "neutral" }),
  pexelsSeed("handCare", { id: "gel-manicure-010", category: "gel_manicure", title: "Hand care gel finish", tags: ["gel", "manicure", "natural", "hands"], mood: "soft", shotType: "hands", nailLength: "short", style: "natural" }),
  pexelsSeed("polishPalette", { id: "gel-manicure-011", category: "gel_manicure", title: "Pastel gel polish collection", tags: ["gel", "manicure", "polish", "pastel"], mood: "soft", shotType: "tools", style: "color" }),
  pexelsSeed("redLifestyle", { id: "gel-manicure-012", category: "gel_manicure", title: "Red manicure lifestyle moment", tags: ["gel", "manicure", "red", "lifestyle"], mood: "clean", shotType: "lifestyle", nailLength: "short", style: "color" }),
  pexelsSeed("artHands", { id: "gel-manicure-013", category: "gel_manicure", title: "Modern nail art gel finish", tags: ["gel", "manicure", "art", "denim"], mood: "glam", shotType: "hands", nailLength: "medium", style: "art" }),
  pexelsSeed("proManicure", { id: "gel-manicure-014", category: "gel_manicure", title: "Professional gel dryer service", tags: ["gel", "manicure", "dryer", "polish"], mood: "clean", shotType: "tools", nailLength: "short", style: "natural" }),
  pexelsSeed("handCare", { id: "builder-gel-007", category: "builder_gel", title: "Builder gel natural overlay", tags: ["builder", "overlay", "natural", "hands"], mood: "clean", shotType: "hands", nailLength: "short", style: "natural" }),
  pexelsSeed("proManicure", { id: "builder-gel-008", category: "builder_gel", title: "Builder gel prep tools", tags: ["builder", "application", "tools", "dryer"], mood: "clean", shotType: "tools", nailLength: "short", style: "natural" }),
  pexelsSeed("luxeHands", { id: "builder-gel-009", category: "builder_gel", title: "Neutral builder gel finish", tags: ["builder", "overlay", "neutral", "strengthening"], mood: "luxury", shotType: "hands", nailLength: "short", style: "neutral" }),
  pexelsSeed("artHands", { id: "builder-gel-010", category: "builder_gel", title: "Builder gel shaped color", tags: ["builder", "application", "overlay", "art"], mood: "glam", shotType: "hands", nailLength: "medium", style: "art" }),
  pexelsSeed("luxeHands", { id: "structured-gel-007", category: "structured_gel", title: "Structured gel neutral shape", tags: ["structured", "architecture", "neutral", "hands"], mood: "luxury", shotType: "hands", nailLength: "short", style: "neutral" }),
  pexelsSeed("proManicure", { id: "structured-gel-008", category: "structured_gel", title: "Structured gel prep station", tags: ["structured", "sculpted", "tools", "application"], mood: "clean", shotType: "tools", nailLength: "short", style: "natural" }),
  pexelsSeed("handCare", { id: "structured-gel-009", category: "structured_gel", title: "Structured gel natural care", tags: ["structured", "overlay", "natural", "care"], mood: "soft", shotType: "hands", nailLength: "short", style: "natural" }),
  pexelsSeed("artHands", { id: "structured-gel-010", category: "structured_gel", title: "Structured gel art profile", tags: ["structured", "sculpted", "art", "architecture"], mood: "glam", shotType: "hands", nailLength: "medium", style: "art" }),
  pexelsSeed("artHands", { id: "gel-x-007", category: "gel_x", title: "Gel-X full-set extension detail", tags: ["gel-x", "extensions", "full-set", "long"], mood: "glam", shotType: "hands", nailLength: "long", style: "art" }),
  pexelsSeed("luxeHands", { id: "gel-x-008", category: "gel_x", title: "Long Gel-X jewelry look", tags: ["gel-x", "extensions", "long", "neutral"], mood: "luxury", shotType: "hands", nailLength: "long", style: "neutral" }),
  pexelsSeed("proManicure", { id: "gel-x-009", category: "gel_x", title: "Gel-X appointment finish", tags: ["gel-x", "extensions", "full-set", "application"], mood: "clean", shotType: "tools", nailLength: "long", style: "natural" }),
  pexelsSeed("redLifestyle", { id: "gel-x-010", category: "gel_x", title: "Gel-X polished lifestyle", tags: ["gel-x", "extensions", "long", "color"], mood: "clean", shotType: "lifestyle", nailLength: "long", style: "color" }),
  pexelsSeed("polishPalette", { id: "gel-x-011", category: "gel_x", title: "Gel-X full-set polish tools", tags: ["gel-x", "full-set", "extensions", "polish"], mood: "glam", shotType: "tools", nailLength: "long", style: "color" }),
  { id: "gel-x-012", category: "gel_x", title: "Gel-X long extension set", unsplashId: LONG_EXTENSION_SET, photographer: "Unsplash", sourceName: "Unsplash", sourceUrl: "https://unsplash.com/photos/1777287852750-53eb2ca506e9", tags: ["gel-x", "extensions", "long", "full-set"], mood: "glam", shotType: "hands", nailLength: "long", style: "color" },
  pexelsSeed("artHands", { id: "acrylic-007", category: "acrylic", title: "Acrylic extension art profile", tags: ["acrylic", "extensions", "long", "art"], mood: "glam", shotType: "hands", nailLength: "long", style: "art" }),
  pexelsSeed("luxeHands", { id: "acrylic-008", category: "acrylic", title: "Neutral acrylic extension finish", tags: ["acrylic", "extensions", "long", "neutral"], mood: "luxury", shotType: "hands", nailLength: "long", style: "neutral" }),
  pexelsSeed("proManicure", { id: "acrylic-009", category: "acrylic", title: "Acrylic full-set salon service", tags: ["acrylic", "extensions", "full-set", "application"], mood: "clean", shotType: "tools", nailLength: "long", style: "natural" }),
  pexelsSeed("redLifestyle", { id: "acrylic-010", category: "acrylic", title: "Acrylic color lifestyle look", tags: ["acrylic", "extensions", "long", "color"], mood: "social", shotType: "lifestyle", nailLength: "long", style: "color" }),
  pexelsSeed("polishPalette", { id: "acrylic-011", category: "acrylic", title: "Acrylic polish palette", tags: ["acrylic", "extensions", "full-set", "polish"], mood: "glam", shotType: "tools", nailLength: "long", style: "color" }),
  { id: "acrylic-012", category: "acrylic", title: "Long acrylic extension set", unsplashId: LONG_EXTENSION_SET, photographer: "Unsplash", sourceName: "Unsplash", sourceUrl: "https://unsplash.com/photos/1777287852750-53eb2ca506e9", tags: ["acrylic", "extensions", "long", "full-set"], mood: "glam", shotType: "hands", nailLength: "long", style: "color" },
  pexelsSeed("redPedicure", { id: "pedicure-007", category: "pedicure", title: "Red pedicure close-up", tags: ["pedicure", "feet", "spa", "red"], mood: "spa", shotType: "feet", style: "color" }),
  pexelsSeed("luxePedicure", { id: "pedicure-008", category: "pedicure", title: "Soft pedicure jewelry detail", tags: ["pedicure", "feet", "anklet", "spa"], mood: "luxury", shotType: "feet", style: "neutral" }),
  pexelsSeed("redPedicure", { id: "pedicure-009", category: "pedicure", title: "Pedicure spa refresh", tags: ["pedicure", "feet", "refresh", "spa"], mood: "soft", shotType: "feet", style: "color" }),
  pexelsSeed("luxePedicure", { id: "pedicure-010", category: "pedicure", title: "Pedicure polish detail", tags: ["pedicure", "feet", "toes", "spa"], mood: "luxury", shotType: "feet", style: "neutral" }),
  pexelsSeed("redPedicure", { id: "pedicure-011", category: "pedicure", title: "Pedicure treatment moment", tags: ["pedicure", "feet", "treatment", "spa"], mood: "spa", shotType: "feet", style: "natural" }),
  pexelsSeed("luxePedicure", { id: "pedicure-012", category: "pedicure", title: "Pedicure care detail", tags: ["pedicure", "feet", "care", "spa"], mood: "spa", shotType: "feet", style: "neutral" }),
  pexelsSeed("proManicure", { id: "fill-refresh-006", category: "fill_refresh", title: "Fill refresh maintenance visit", tags: ["fill", "refresh", "maintenance", "application"], mood: "clean", shotType: "tools", nailLength: "medium", style: "natural" }),
  pexelsSeed("luxeHands", { id: "fill-refresh-007", category: "fill_refresh", title: "Neutral refill finish", tags: ["refill", "refresh", "maintenance", "neutral"], mood: "luxury", shotType: "hands", nailLength: "medium", style: "neutral" }),
  pexelsSeed("handCare", { id: "fill-refresh-008", category: "fill_refresh", title: "Refresh appointment hand care", tags: ["refresh", "maintenance", "care", "hands"], mood: "soft", shotType: "hands", nailLength: "short", style: "natural" }),
  pexelsSeed("redLifestyle", { id: "fill-refresh-009", category: "fill_refresh", title: "Color refresh check-in", tags: ["fill", "refresh", "maintenance", "color"], mood: "clean", shotType: "lifestyle", nailLength: "medium", style: "color" }),
  pexelsSeed("polishPalette", { id: "fill-refresh-010", category: "fill_refresh", title: "Polish refresh palette", tags: ["refresh", "maintenance", "polish", "fill"], mood: "soft", shotType: "tools", style: "color" }),
  pexelsSeed("proManicure", { id: "generic-salon-005", category: "generic_salon", title: "Professional manicure appointment", tags: ["salon", "beauty", "appointment", "service"], mood: "clean", shotType: "salon", style: "natural" }),
  pexelsSeed("handCare", { id: "generic-salon-006", category: "generic_salon", title: "Soft salon hand care", tags: ["salon", "beauty", "care", "hands"], mood: "soft", shotType: "client", style: "natural" }),
  pexelsSeed("luxeHands", { id: "generic-salon-007", category: "generic_salon", title: "Elegant salon finish", tags: ["salon", "luxury", "beauty", "hands"], mood: "luxury", shotType: "client", style: "neutral" }),
  pexelsSeed("polishPalette", { id: "generic-salon-008", category: "generic_salon", title: "Polish palette salon detail", tags: ["salon", "polish", "beauty", "tools"], mood: "glam", shotType: "tools", style: "color" }),
];

export const servicePhotoLibrary: ServicePhotoAsset[] = [
  ...ASSET_SEEDS,
  ...EXTRA_ASSET_SEEDS,
].map(buildAsset);



export function getActiveServiceAssets(category: ServicePhotoCategory): ServicePhotoAsset[] {

  const exact = servicePhotoLibrary.filter((asset) => asset.active && asset.category === category);

  if (exact.length > 0) return exact;

  return servicePhotoLibrary.filter((asset) => asset.active && asset.category === "generic_salon");

}



export function getServiceAssetById(assetId?: string | null): ServicePhotoAsset | undefined {

  if (!assetId) return undefined;

  return servicePhotoLibrary.find((asset) => asset.active && asset.id === assetId);

}



export function getFallbackServiceAsset(): ServicePhotoAsset {

  return (

    servicePhotoLibrary.find(

      (asset) => asset.active && asset.category === "generic_salon" && asset.featured,

    ) ??

    servicePhotoLibrary.find((asset) => asset.active && asset.category === "generic_salon") ??

    servicePhotoLibrary[0] ?? {

      id: "fallback-vmb",

      category: "generic_salon",

      title: "Salon service",

      imageUrl: pexelsUrl(3997386),

      tags: ["fallback", "salon"],

      active: true,

      featured: true,

      sourceName: "Pexels",

    }

  );

}



export function countAssetsByCategory(): Record<ServicePhotoCategory, number> {

  const counts = {} as Record<ServicePhotoCategory, number>;

  for (const asset of servicePhotoLibrary) {

    if (!asset.active) continue;

    counts[asset.category] = (counts[asset.category] ?? 0) + 1;

  }

  return counts;

}


