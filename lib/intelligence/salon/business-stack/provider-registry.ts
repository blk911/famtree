// lib/intelligence/salon/business-stack/provider-registry.ts

import type { SalonStackProvider } from "./types";

export const SALON_STACK_PROVIDERS: SalonStackProvider[] = [
  // Booking / POS
  { id: "glossgenius", label: "GlossGenius", category: "booking", domains: ["glossgenius.com", "glossgenius.io", "glossgenius.app.link", "glossgenius.site", "book.glossgenius.com"] },
  { id: "vagaro", label: "Vagaro", category: "booking", domains: ["vagaro.com", "vagaro.app.link"], urlPatterns: ["/book", "/us/"] },
  { id: "square_appointments", label: "Square Appointments", category: "booking", domains: ["book.squareup.com", "booking.squareup.com"], urlPatterns: ["squareup.com/appointments", "square.site/book"] },
  { id: "booksy", label: "Booksy", category: "booking", domains: ["booksy.com"], urlPatterns: ["/en-us/", "/book"] },
  { id: "fresha", label: "Fresha", category: "booking", domains: ["fresha.com", "fresha.net"] },
  { id: "styleseat", label: "StyleSeat", category: "booking", domains: ["styleseat.com"] },
  { id: "schedulicity", label: "Schedulicity", category: "booking", domains: ["schedulicity.com"] },
  { id: "acuity", label: "Acuity Scheduling", category: "booking", domains: ["acuityscheduling.com", "acuityappointments.com"] },
  { id: "mangomint", label: "Mangomint", category: "booking", domains: ["mangomint.com", "mangomint.co"] },
  { id: "phorest", label: "Phorest", category: "booking", domains: ["phorest.com", "phorestsalonsoftware.com"] },
  { id: "boulevard", label: "Boulevard", category: "booking", domains: ["joinblvd.com", "boulevard.co"] },
  { id: "mindbody", label: "Mindbody", category: "booking", domains: ["mindbodyonline.com", "mindbody.io"] },
  { id: "setmore", label: "Setmore", category: "booking", domains: ["setmore.com"] },
  { id: "timely", label: "Timely", category: "booking", domains: ["gettimely.com", "timely.com"] },
  { id: "zenoti", label: "Zenoti", category: "booking", domains: ["zenoti.com"] },
  { id: "rosy", label: "Rosy", category: "booking", domains: ["rosy.com", "rosysalonsoftware.com"] },
  { id: "daysmart", label: "DaySmart", category: "booking", domains: ["daysmart.com", "daysmartappointments.com"] },
  { id: "meevo", label: "Meevo", category: "booking", domains: ["meevo.com", "meevobiz.com"] },
  { id: "calendly", label: "Calendly", category: "booking", domains: ["calendly.com"] },
  // Check-in / queue
  { id: "gocheckin", label: "GoCheckIn", category: "check_in", domains: ["gocheckin.net", "gocheckin.com"] },
  { id: "waitwhile", label: "Waitwhile", category: "check_in", domains: ["waitwhile.com"] },
  { id: "waitlist_me", label: "Waitlist.me", category: "check_in", domains: ["waitlist.me"] },
  { id: "qminder", label: "Qminder", category: "check_in", domains: ["qminder.com"] },
  // Payments
  { id: "square", label: "Square", category: "payments", domains: ["squareup.com", "square.site", "checkout.square.site"], urlPatterns: ["/pricing", "/payments", "/pos"] },
  { id: "stripe", label: "Stripe", category: "payments", domains: ["stripe.com", "checkout.stripe.com", "js.stripe.com"] },
  { id: "clover", label: "Clover", category: "payments", domains: ["clover.com"] },
  { id: "paypal", label: "PayPal", category: "payments", domains: ["paypal.com", "paypal.me"] },
  { id: "authorize_net", label: "Authorize.net", category: "payments", domains: ["authorize.net"] },
  { id: "shop_pay", label: "Shop Pay", category: "payments", domains: ["shop.app", "shopify.com/checkouts"] },
  // Website builders
  { id: "squarespace", label: "Squarespace", category: "website_builder", domains: ["squarespace.com", "sqspcdn.com"] },
  { id: "wix", label: "Wix", category: "website_builder", domains: ["wix.com", "wixsite.com", "wixstatic.com"] },
  { id: "wordpress", label: "WordPress", category: "website_builder", domains: ["wordpress.com", "wp.com"], htmlMarkers: ["wp-content", "wordpress"] },
  { id: "shopify", label: "Shopify", category: "ecommerce", domains: ["myshopify.com", "cdn.shopify.com", "shopify.com"], htmlMarkers: ["cdn.shopify.com", "Shopify.theme"] },
  { id: "godaddy", label: "GoDaddy Sites", category: "website_builder", domains: ["godaddysites.com", "godaddy.com"] },
  { id: "webflow", label: "Webflow", category: "website_builder", domains: ["webflow.io", "webflow.com"] },
  // Reviews / listing
  { id: "google_business", label: "Google Business", category: "reviews", domains: ["google.com/maps", "g.page", "maps.app.goo.gl", "business.google.com"] },
  { id: "yelp", label: "Yelp", category: "reviews", domains: ["yelp.com", "yelp.to"] },
  { id: "bbb", label: "BBB", category: "reviews", domains: ["bbb.org"] },
  // Marketing / analytics
  { id: "meta_pixel", label: "Meta Pixel", category: "marketing", domains: ["connect.facebook.net"], htmlMarkers: ["fbq(", "facebook.com/tr"] },
  { id: "google_analytics", label: "Google Analytics", category: "analytics", domains: ["googletagmanager.com", "google-analytics.com"], htmlMarkers: ["gtag(", "GTM-", "google-analytics.com"] },
  { id: "tiktok_pixel", label: "TikTok Pixel", category: "marketing", domains: ["analytics.tiktok.com"], htmlMarkers: ["ttq.load"] },
  { id: "mailchimp", label: "Mailchimp", category: "marketing", domains: ["mailchimp.com", "list-manage.com", "eep.io"] },
  { id: "klaviyo", label: "Klaviyo", category: "marketing", domains: ["klaviyo.com"], htmlMarkers: ["klaviyo"] },
  // Social
  { id: "instagram", label: "Instagram", category: "social", domains: ["instagram.com"] },
  { id: "facebook", label: "Facebook", category: "social", domains: ["facebook.com", "fb.com", "fb.me"] },
  { id: "tiktok", label: "TikTok", category: "social", domains: ["tiktok.com"] },
  { id: "youtube", label: "YouTube", category: "social", domains: ["youtube.com", "youtu.be"] },
];

const BY_ID = new Map(SALON_STACK_PROVIDERS.map((p) => [p.id, p]));

export function getStackProvider(id: string): SalonStackProvider | undefined {
  return BY_ID.get(id);
}

export function bookingProviderIdToStackId(bookingProvider?: string): string | undefined {
  if (!bookingProvider) return undefined;
  const map: Record<string, string> = {
    glossgenius: "glossgenius",
    vagaro: "vagaro",
    square: "square_appointments",
    booksy: "booksy",
    fresha: "fresha",
    styleseat: "styleseat",
    schedulicity: "schedulicity",
    acuity: "acuity",
    mangomint: "mangomint",
    timely: "timely",
    setmore: "setmore",
  };
  return map[bookingProvider] ?? bookingProvider;
}
