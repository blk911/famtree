import type { ServicePhotoAsset, ServicePhotoCategory } from "./service-image-types";



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



export const servicePhotoLibrary: ServicePhotoAsset[] = ASSET_SEEDS.map(buildAsset);



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


