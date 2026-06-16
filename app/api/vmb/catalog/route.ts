import { NextResponse } from "next/server";
import {
  listCatalogServiceOffers,
  listServiceAddons,
  listServiceCategories,
  OFFER_ADDON_MAP,
} from "@/lib/vmb/services/canonical-service-catalog";

export const dynamic = "force-dynamic";

/** Read-only platform canonical catalog. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    categories: listServiceCategories(),
    offers: listCatalogServiceOffers(),
    addons: listServiceAddons(),
    offerAddonMap: OFFER_ADDON_MAP,
  });
}
