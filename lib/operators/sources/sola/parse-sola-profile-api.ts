// lib/operators/sources/sola/parse-sola-profile-api.ts

import { extractProfileSlug } from "./profile-url-utils";
import { dedupeLinks } from "./link-utils";

export interface ParsedSolaProfileApi {
  phones: string[];
  emails: string[];
  socialLinks: string[];
  externalLinks: string[];
  bookingLinks: string[];
  bio?: string;
  services: string[];
  categories: string[];
  professionalName?: string;
  businessName?: string;
  imageUrls: string[];
}

const PHONE_KEYS = /^(telephone|phone|mobile|cell|contactphone|phonenumber)$/i;
const EMAIL_KEYS = /^email$/i;
const BIO_KEYS = /^(bio|about|description|specialinstruction|aboutus)$/i;
const NAME_KEYS = /^(businessname|companyname|salonname)$/i;
const PRO_KEYS = /^(username|professionalname|providername|staffname|ownername|firstname|displayname)$/i;
const IMAGE_KEYS = /^(businessimage|userphoto|photo|image|logo|photourl|imageurl|avatar)$/i;
const URL_KEYS = /^(websiteurl|website|url|externallink|bookingurl|vagarourl)$/i;
const SERVICE_KEYS = /^(service|services|category|categories|classname|servicename|primaryservice)$/i;

const SOCIAL_PATTERNS = [
  { re: /instagram\.com/i, label: "instagram" },
  { re: /facebook\.com|fb\.com/i, label: "facebook" },
  { re: /tiktok\.com/i, label: "tiktok" },
  { re: /twitter\.com|x\.com/i, label: "twitter" },
];

const KNOWN_SERVICES = [
  "Hair",
  "Hair Extensions",
  "Lashes",
  "Waxing",
  "Barber",
  "Brows",
  "Nails",
  "Skin Care",
  "Makeup",
  "Massage",
  "Electrolysis",
  "Braids",
];

function normalizePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isEncryptedBlob(value: string): boolean {
  return value.startsWith("U2FsdGVkX1") || value.length > 80;
}

function pushUnique(target: string[], value?: string): void {
  const trimmed = value?.trim();
  if (!trimmed || target.includes(trimmed)) return;
  target.push(trimmed);
}

function classifyUrl(url: string, parsed: ParsedSolaProfileApi): void {
  const lower = url.toLowerCase();
  if (lower.startsWith("tel:")) {
    const phone = normalizePhone(url.replace(/^tel:/i, ""));
    if (phone) pushUnique(parsed.phones, phone);
    return;
  }
  if (lower.startsWith("mailto:")) {
    const email = url.replace(/^mailto:/i, "").split("?")[0];
    if (email && !isEncryptedBlob(email)) pushUnique(parsed.emails, email);
    return;
  }
  if (!isHttpUrl(url)) return;

  if (SOCIAL_PATTERNS.some((pattern) => pattern.re.test(url))) {
    pushUnique(parsed.socialLinks, url);
    return;
  }
  if (lower.includes("vagaro.com") && !lower.includes("/pro/")) {
    pushUnique(parsed.bookingLinks, url);
    return;
  }
  if (lower.includes("book.solasalonstudios.com")) {
    pushUnique(parsed.bookingLinks, url);
    return;
  }
  if (lower.includes("solasalonstudios.com") && !lower.includes("salon-professional")) {
    return;
  }
  pushUnique(parsed.externalLinks, url);
}

function parseServicesFromKeywords(metaKeywords?: string): string[] {
  if (!metaKeywords) return [];
  const found: string[] = [];
  for (const label of KNOWN_SERVICES) {
    if (metaKeywords.includes(label)) found.push(label);
  }
  return found;
}

function slugMatches(a: string, b: string): boolean {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

function pickVagaroBusinessRecord(
  records: unknown[],
  profileSlug?: string,
): Record<string, unknown> | undefined {
  const objects = records.filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
  );
  if (!objects.length) return undefined;

  if (profileSlug) {
    const bySlug = objects.find((row) => {
      const vagaroURL = String(row.vagaroURL ?? row.VagaroURL ?? "");
      return vagaroURL && slugMatches(vagaroURL, profileSlug);
    });
    if (bySlug) return bySlug;
  }

  const nonHq = objects.filter(
    (row) => !String(row.businessName ?? "").toLowerCase().includes("sola salons hq"),
  );
  const selected = nonHq.find((row) => row.isSelected === true);
  if (selected) return selected;

  return nonHq[0] ?? objects[0];
}

function applyVagaroBusinessRecord(
  record: Record<string, unknown>,
  parsed: ParsedSolaProfileApi,
): void {
  const businessName = String(record.businessName ?? record.BusinessName ?? "").trim();
  const professionalName = String(record.userName ?? record.UserName ?? "").trim();
  const telephone = String(record.telephone ?? record.Telephone ?? "").trim();
  const description = String(record.description ?? record.Description ?? "").trim();
  const websiteURL = String(record.websiteURL ?? record.WebsiteURL ?? "").trim();
  const vagaroURL = String(record.vagaroURL ?? record.VagaroURL ?? "").trim();
  const cdnUrl = String(record.cdnUrl ?? record.CDNUrl ?? "").trim();
  const businessImage = String(record.businessImage ?? record.BusinessImage ?? "").trim();
  const email = String(record.email ?? record.Email ?? "").trim();
  const metaKeywords = String(record.metaKeywords ?? record.MetaKeywords ?? "").trim();

  if (businessName) parsed.businessName = businessName;
  if (professionalName) parsed.professionalName = professionalName;

  const phone = normalizePhone(telephone);
  if (phone) pushUnique(parsed.phones, phone);

  if (email && !isEncryptedBlob(email)) pushUnique(parsed.emails, email);
  if (description && description.length > 20) parsed.bio = description;

  if (websiteURL && isHttpUrl(websiteURL)) classifyUrl(websiteURL, parsed);
  if (vagaroURL) {
    classifyUrl(`https://www.vagaro.com/${vagaroURL.replace(/^\//, "")}`, parsed);
  }

  if (businessImage && cdnUrl) {
    const imageUrl = businessImage.startsWith("http")
      ? businessImage
      : `${cdnUrl.replace(/\/$/, "")}/Original/${businessImage.replace(/^\//, "")}`;
    pushUnique(parsed.imageUrls, imageUrl);
  }

  for (const service of parseServicesFromKeywords(metaKeywords)) {
    pushUnique(parsed.services, service);
    pushUnique(parsed.categories, service);
  }
}

function scanValue(key: string, value: unknown, parsed: ParsedSolaProfileApi): void {
  if (value == null) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (PHONE_KEYS.test(key)) {
      const phone = normalizePhone(trimmed);
      if (phone) pushUnique(parsed.phones, phone);
      return;
    }
    if (EMAIL_KEYS.test(key) && trimmed.includes("@") && !isEncryptedBlob(trimmed)) {
      pushUnique(parsed.emails, trimmed);
      return;
    }
    if (BIO_KEYS.test(key) && trimmed.length > 20 && !parsed.bio) {
      parsed.bio = trimmed.slice(0, 1200);
      return;
    }
    if (NAME_KEYS.test(key) && !parsed.businessName) {
      parsed.businessName = trimmed;
      return;
    }
    if (PRO_KEYS.test(key) && !parsed.professionalName) {
      parsed.professionalName = trimmed;
      return;
    }
    if (IMAGE_KEYS.test(key)) {
      if (isHttpUrl(trimmed)) pushUnique(parsed.imageUrls, trimmed);
      return;
    }
    if (URL_KEYS.test(key) || isHttpUrl(trimmed)) {
      classifyUrl(trimmed, parsed);
      return;
    }
    if (SERVICE_KEYS.test(key)) {
      pushUnique(parsed.services, trimmed);
      pushUnique(parsed.categories, trimmed);
      return;
    }
    if (trimmed.includes("@") && trimmed.includes(".") && !isEncryptedBlob(trimmed)) {
      pushUnique(parsed.emails, trimmed);
    }
    if (isHttpUrl(trimmed)) classifyUrl(trimmed, parsed);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) scanNode(item, parsed);
    return;
  }

  if (typeof value === "object") {
    scanNode(value, parsed);
  }
}

function scanNode(node: unknown, parsed: ParsedSolaProfileApi): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) scanNode(item, parsed);
    return;
  }
  if (typeof node !== "object") return;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    scanValue(key, value, parsed);
  }
}

export function parseSolaProfileApi(
  json: unknown,
  profileUrl?: string,
): ParsedSolaProfileApi {
  const parsed: ParsedSolaProfileApi = {
    phones: [],
    emails: [],
    socialLinks: [],
    externalLinks: [],
    bookingLinks: [],
    services: [],
    categories: [],
    imageUrls: [],
  };

  if (!json || typeof json !== "object") return parsed;

  const root = json as Record<string, unknown>;
  const data = root.data ?? root.Data;
  if (Array.isArray(data) && data.length > 0) {
    const profileSlug = profileUrl ? extractProfileSlug(profileUrl) : undefined;
    const record = pickVagaroBusinessRecord(data, profileSlug);
    if (record) applyVagaroBusinessRecord(record, parsed);
  }

  scanNode(json, parsed);

  return {
    phones: dedupeLinks(parsed.phones),
    emails: dedupeLinks(parsed.emails),
    socialLinks: dedupeLinks(parsed.socialLinks),
    externalLinks: dedupeLinks(parsed.externalLinks),
    bookingLinks: dedupeLinks(parsed.bookingLinks),
    bio: parsed.bio,
    services: dedupeLinks(parsed.services),
    categories: dedupeLinks(parsed.categories),
    professionalName: parsed.professionalName,
    businessName: parsed.businessName,
    imageUrls: dedupeLinks(parsed.imageUrls),
  };
}

export function parsedApiHasSignal(parsed: ParsedSolaProfileApi): boolean {
  return Boolean(
    parsed.phones.length ||
      parsed.emails.length ||
      parsed.socialLinks.length ||
      parsed.externalLinks.length ||
      parsed.bookingLinks.length ||
      parsed.services.length ||
      parsed.bio ||
      parsed.professionalName ||
      parsed.businessName ||
      parsed.imageUrls.length,
  );
}
