// lib/studios/creator-lab/url-utils.ts
// Platform detection and URL normalization for the Studio Assembler lab.

import type { Platform } from "./types";

/** Normalize a raw input URL — add scheme if missing, strip tracking params. */
export function normalizeUrl(raw: string): string {
  const withScheme = raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;
  try {
    const u = new URL(withScheme);
    // Strip common tracking params
    const strip = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "igshid", "ref"];
    strip.forEach((p) => u.searchParams.delete(p));
    // Normalize trailing slash for root paths
    if (u.pathname === "" || u.pathname === "/") u.pathname = "/";
    return u.toString();
  } catch {
    return withScheme;
  }
}

/** Detect which platform a URL belongs to. */
export function detectPlatform(url: string): Platform {
  try {
    const hostname = new URL(normalizeUrl(url)).hostname.toLowerCase();
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("etsy.com"))      return "etsy";
    if (hostname.includes("shopify.com") || hostname.endsWith(".myshopify.com")) return "shopify";
    if (hostname.includes("squarespace.com")) return "squarespace";
    if (hostname.includes("wix.com") || hostname.includes("wixsite.com")) return "wix";
    if (hostname.includes("bigcartel.com")) return "bigcartel";
    return "website";
  } catch {
    return "unknown";
  }
}

/** Generate a stable slug-safe creator ID from a URL + timestamp. */
export function generateCreatorId(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    // Extract meaningful slug piece from URL
    const pathParts = u.pathname.split("/").filter(Boolean);
    const slug =
      pathParts[0]
        ? pathParts[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 32)
        : u.hostname.replace(/\./g, "-").slice(0, 24);

    const ts = Date.now().toString(36); // compact timestamp
    return `${slug}-${ts}`.slice(0, 48);
  } catch {
    return `creator-${Date.now().toString(36)}`;
  }
}

/** Extract a handle-like string from a URL (@ handle on IG, shop name on Etsy, etc). */
export function extractHandle(url: string, platform: Platform): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    const parts = u.pathname.split("/").filter(Boolean);
    switch (platform) {
      case "instagram":
        // instagram.com/handle or instagram.com/p/... (post — no handle in URL)
        return parts[0] && parts[0] !== "p" && parts[0] !== "reel" ? `@${parts[0]}` : null;
      case "etsy":
        // etsy.com/shop/ShopName
        if (parts[0] === "shop" && parts[1]) return parts[1];
        return null;
      case "shopify":
        return u.hostname.split(".")[0] || null;
      case "squarespace":
      case "wix":
      case "bigcartel":
      case "website":
        // Use subdomain or first path segment
        const sub = u.hostname.split(".")[0];
        return sub && sub !== "www" ? sub : (parts[0] ?? null);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** Return the base/canonical URL for a given platform profile (strips post paths). */
export function canonicalProfileUrl(url: string, platform: Platform): string {
  try {
    const u = new URL(normalizeUrl(url));
    switch (platform) {
      case "instagram": {
        const parts = u.pathname.split("/").filter(Boolean);
        // Strip /p/xxx or /reel/xxx suffixes
        if (parts[0] && !["p", "reel", "stories", "tv"].includes(parts[0])) {
          return `https://www.instagram.com/${parts[0]}/`;
        }
        return url;
      }
      case "etsy": {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "shop" && parts[1]) return `https://www.etsy.com/shop/${parts[1]}`;
        return url;
      }
      default:
        return `${u.origin}/`;
    }
  } catch {
    return url;
  }
}
