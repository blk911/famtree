import type { ServicePhotoAsset, ServicePhotoCategory } from "./service-image-types";

type AssetSeed = {
  id: string;
  category: ServicePhotoCategory;
  title: string;
  unsplashId?: string;
  pexelsId?: number;
  pixabayPath?: string;
  photographer: string;
  sourceName: "Unsplash" | "Pexels" | "Pixabay";
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

function pixabayUrl(path: string): string {
  return `https://cdn.pixabay.com/photo/${path}`;
}

function buildAsset(seed: AssetSeed): ServicePhotoAsset {
  const imageUrl = seed.unsplashId
    ? unsplashUrl(seed.unsplashId)
    : seed.pexelsId
      ? pexelsUrl(seed.pexelsId)
      : seed.pixabayPath
        ? pixabayUrl(seed.pixabayPath)
        : unsplashUrl("1560066984-138d3694a035");

  return {
    id: seed.id,
    category: seed.category,
    title: seed.title,
    imageUrl,
    thumbnailUrl: seed.unsplashId
      ? unsplashUrl(seed.unsplashId, 240)
      : seed.pexelsId
        ? pexelsUrl(seed.pexelsId, 240)
        : imageUrl,
    photographer: seed.photographer,
    sourceName: seed.sourceName,
    sourceUrl: seed.sourceUrl,
    tags: seed.tags,
    active: true,
    featured: seed.featured,
  };
}

const ASSET_SEEDS: AssetSeed[] = [
  // gel_manicure (8)
  {
    id: "gel-manicure-001",
    category: "gel_manicure",
    title: "Soft pink gel manicure",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["pink", "gel", "hands", "polished"],
    featured: true,
  },
  {
    id: "gel-manicure-002",
    category: "gel_manicure",
    title: "Neutral gel polish finish",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["neutral", "gel", "manicure"],
  },
  {
    id: "gel-manicure-003",
    category: "gel_manicure",
    title: "Classic nude gel manicure",
    unsplashId: "1519014815655-bf4632bd5cad",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/womans-left-hand-on-white-textile-1519014815655",
    tags: ["nude", "gel", "classic"],
  },
  {
    id: "gel-manicure-004",
    category: "gel_manicure",
    title: "Glossy rose gel manicure",
    unsplashId: "1610992015732-4923956a373e",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-holding-red-and-white-plastic-bottle-1610992015732",
    tags: ["rose", "glossy", "gel"],
  },
  {
    id: "gel-manicure-005",
    category: "gel_manicure",
    title: "Clean gel manicure at table",
    unsplashId: "1522337360788-8bbb13af2c66",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-holding-makeup-brush-1522337360788",
    tags: ["beauty", "gel", "salon"],
  },
  {
    id: "gel-manicure-006",
    category: "gel_manicure",
    title: "Pastel gel manicure detail",
    pexelsId: 3997985,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",
    tags: ["pastel", "gel", "detail"],
  },
  {
    id: "gel-manicure-007",
    category: "gel_manicure",
    title: "Hand care gel manicure",
    unsplashId: "1599949287880-3f30980476ec",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-in-white-long-sleeve-shirt-holding-white-ceramic-mug-1599949287880",
    tags: ["care", "hands", "gel"],
  },
  {
    id: "gel-manicure-008",
    category: "gel_manicure",
    title: "Minimal gel manicure styling",
    unsplashId: "1607776351-8724128271f2",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-red-nail-polish-1607776351",
    tags: ["minimal", "gel", "style"],
  },
  // builder_gel (6)
  {
    id: "builder-gel-001",
    category: "builder_gel",
    title: "Builder gel overlay finish",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["builder", "overlay", "strong"],
    featured: true,
  },
  {
    id: "builder-gel-002",
    category: "builder_gel",
    title: "Natural builder gel nails",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["natural", "builder", "nails"],
  },
  {
    id: "builder-gel-003",
    category: "builder_gel",
    title: "Builder gel shaping",
    pexelsId: 3685530,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",
    tags: ["builder", "shape", "salon"],
  },
  {
    id: "builder-gel-004",
    category: "builder_gel",
    title: "Structured builder gel look",
    unsplashId: "1562322560-ab61cd061e47",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-with-red-nail-polish-1562322560",
    tags: ["structured", "builder", "gel"],
  },
  {
    id: "builder-gel-005",
    category: "builder_gel",
    title: "Builder gel manicure session",
    pexelsId: 3997386,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",
    tags: ["session", "builder", "manicure"],
  },
  {
    id: "builder-gel-006",
    category: "builder_gel",
    title: "Soft builder gel finish",
    unsplashId: "1519014815655-bf4632bd5cad",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/womans-left-hand-on-white-textile-1519014815655",
    tags: ["soft", "builder", "finish"],
  },
  // structured_gel (6)
  {
    id: "structured-gel-001",
    category: "structured_gel",
    title: "Structured gel architecture",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["structured", "architecture", "gel"],
    featured: true,
  },
  {
    id: "structured-gel-002",
    category: "structured_gel",
    title: "Sculpted structured gel",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["sculpted", "structured", "gel"],
  },
  {
    id: "structured-gel-003",
    category: "structured_gel",
    title: "Structured gel nail art base",
    pexelsId: 3997985,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",
    tags: ["art", "structured", "base"],
  },
  {
    id: "structured-gel-004",
    category: "structured_gel",
    title: "Defined structured gel tips",
    unsplashId: "1607776351-8724128271f2",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-red-nail-polish-1607776351",
    tags: ["tips", "defined", "structured"],
  },
  {
    id: "structured-gel-005",
    category: "structured_gel",
    title: "Structured gel polish detail",
    unsplashId: "1610992015732-4923956a373e",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-holding-red-and-white-plastic-bottle-1610992015732",
    tags: ["polish", "detail", "structured"],
  },
  {
    id: "structured-gel-006",
    category: "structured_gel",
    title: "Structured gel salon finish",
    pexelsId: 3685530,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",
    tags: ["salon", "finish", "structured"],
  },
  // gel_x (6)
  {
    id: "gel-x-001",
    category: "gel_x",
    title: "Gel-X extension set",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["gel-x", "extensions", "length"],
    featured: true,
  },
  {
    id: "gel-x-002",
    category: "gel_x",
    title: "Soft gel-X almond shape",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["almond", "gel-x", "soft"],
  },
  {
    id: "gel-x-003",
    category: "gel_x",
    title: "Gel-X extension application",
    pexelsId: 3997386,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",
    tags: ["application", "gel-x", "salon"],
  },
  {
    id: "gel-x-004",
    category: "gel_x",
    title: "Long gel-X manicure",
    unsplashId: "1562322560-ab61cd061e47",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-with-red-nail-polish-1562322560",
    tags: ["long", "gel-x", "manicure"],
  },
  {
    id: "gel-x-005",
    category: "gel_x",
    title: "Gel-X natural extension look",
    pexelsId: 3997985,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",
    tags: ["natural", "gel-x", "extensions"],
  },
  {
    id: "gel-x-006",
    category: "gel_x",
    title: "Gel-X glossy finish",
    unsplashId: "1607776351-8724128271f2",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-red-nail-polish-1607776351",
    tags: ["glossy", "gel-x", "finish"],
  },
  // acrylic (6)
  {
    id: "acrylic-001",
    category: "acrylic",
    title: "Acrylic extension set",
    unsplashId: "1562322560-ab61cd061e47",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-with-red-nail-polish-1562322560",
    tags: ["acrylic", "extensions", "bold"],
    featured: true,
  },
  {
    id: "acrylic-002",
    category: "acrylic",
    title: "Classic acrylic nails",
    unsplashId: "1607776351-8724128271f2",
    photographer: "Maria Orlova",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-red-nail-polish-1607776351",
    tags: ["classic", "acrylic", "nails"],
  },
  {
    id: "acrylic-003",
    category: "acrylic",
    title: "Acrylic shaping at station",
    pexelsId: 3685530,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",
    tags: ["shaping", "acrylic", "station"],
  },
  {
    id: "acrylic-004",
    category: "acrylic",
    title: "French acrylic extensions",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["french", "acrylic", "extensions"],
  },
  {
    id: "acrylic-005",
    category: "acrylic",
    title: "Acrylic full set",
    pexelsId: 3997386,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",
    tags: ["full-set", "acrylic", "salon"],
  },
  {
    id: "acrylic-006",
    category: "acrylic",
    title: "Sculpted acrylic finish",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["sculpted", "acrylic", "finish"],
  },
  // pedicure (6)
  {
    id: "pedicure-001",
    category: "pedicure",
    title: "Smart pedicure soak",
    unsplashId: "1521590832688-46c1c9ee3a62",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-in-white-tank-top-sitting-on-brown-wooden-chair-1521590832688",
    tags: ["pedicure", "soak", "spa"],
    featured: true,
  },
  {
    id: "pedicure-002",
    category: "pedicure",
    title: "Spa pedicure treatment",
    unsplashId: "1540555700478-4be289fbecef",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-in-white-tank-top-1540555700478",
    tags: ["spa", "pedicure", "relax"],
  },
  {
    id: "pedicure-003",
    category: "pedicure",
    title: "Pedicure foot care",
    pexelsId: 3997991,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/person-doing-pedicure-3997991/",
    tags: ["foot", "care", "pedicure"],
  },
  {
    id: "pedicure-004",
    category: "pedicure",
    title: "Salon pedicure chair",
    unsplashId: "1599949287880-3f30980476ec",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-in-white-long-sleeve-shirt-holding-white-ceramic-mug-1599949287880",
    tags: ["salon", "chair", "pedicure"],
  },
  {
    id: "pedicure-005",
    category: "pedicure",
    title: "Polished pedicure finish",
    pixabayPath: "2017/11/14/16/11/hands-2948423_960_720.jpg",
    photographer: "Pexels",
    sourceName: "Pixabay",
    sourceUrl: "https://pixabay.com/photos/hands-nail-polish-manicure-2948423/",
    tags: ["polish", "pedicure", "finish"],
  },
  {
    id: "pedicure-006",
    category: "pedicure",
    title: "Refresh pedicure detail",
    pexelsId: 3997386,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",
    tags: ["refresh", "detail", "pedicure"],
  },
  // fill_refresh (5)
  {
    id: "fill-refresh-001",
    category: "fill_refresh",
    title: "Fill and refresh maintenance",
    unsplashId: "1604654894610-df63bc536371",
    photographer: "Drew Beamer",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/pink-and-white-nail-polish-on-persons-left-hand-1604654894610",
    tags: ["fill", "refresh", "maintenance"],
    featured: true,
  },
  {
    id: "fill-refresh-002",
    category: "fill_refresh",
    title: "Two-week fill refresh",
    unsplashId: "1632345031435-8727f6897d53",
    photographer: "Micheile Henderson",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/person-with-white-nail-polish-1632345031435",
    tags: ["two-week", "fill", "refresh"],
  },
  {
    id: "fill-refresh-003",
    category: "fill_refresh",
    title: "Refresh touch-up session",
    pexelsId: 3685530,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/person-doing-manicure-3685530/",
    tags: ["touch-up", "refresh", "salon"],
  },
  {
    id: "fill-refresh-004",
    category: "fill_refresh",
    title: "Fill refresh polish update",
    unsplashId: "1519014815655-bf4632bd5cad",
    photographer: "Sabrianna",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/womans-left-hand-on-white-textile-1519014815655",
    tags: ["polish", "fill", "update"],
  },
  {
    id: "fill-refresh-005",
    category: "fill_refresh",
    title: "Maintenance fill refresh",
    pexelsId: 3997985,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-with-pink-manicure-3997985/",
    tags: ["maintenance", "fill", "refresh"],
  },
  // generic_salon (4)
  {
    id: "generic-salon-001",
    category: "generic_salon",
    title: "Warm salon welcome",
    unsplashId: "1560066984-138d3694a035",
    photographer: "Mostafa Meraji",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-sitting-beside-woman-1560066984",
    tags: ["salon", "welcome", "beauty"],
    featured: true,
  },
  {
    id: "generic-salon-002",
    category: "generic_salon",
    title: "Private client salon moment",
    unsplashId: "1522337360788-8bbb13af2c66",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-holding-makeup-brush-1522337360788",
    tags: ["private", "client", "salon"],
  },
  {
    id: "generic-salon-003",
    category: "generic_salon",
    title: "Salon service atmosphere",
    pexelsId: 3997386,
    photographer: "cottonbro studio",
    sourceName: "Pexels",
    sourceUrl: "https://www.pexels.com/photo/woman-getting-her-nails-done-3997386/",
    tags: ["service", "atmosphere", "salon"],
  },
  {
    id: "generic-salon-004",
    category: "generic_salon",
    title: "Trusted beauty destination",
    unsplashId: "1599949287880-3f30980476ec",
    photographer: "Angela Roma",
    sourceName: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/woman-in-white-long-sleeve-shirt-holding-white-ceramic-mug-1599949287880",
    tags: ["trusted", "beauty", "destination"],
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
      imageUrl: unsplashUrl("1560066984-138d3694a035"),
      tags: ["fallback"],
      active: true,
      featured: true,
      sourceName: "Unsplash",
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
