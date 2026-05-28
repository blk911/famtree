export type StyleSeatScriptIndexEntry = {
  index: number;
  attributes: string;
  src?: string;
  type?: string;
  id?: string;
  textLength: number;
  first500: string;
  markersFound: string[];
};

export type EmbeddedStyleSeatBlob = {
  sourceType: string;
  attributes?: string;
  length: number;
  snippet: string;
  parsed?: unknown;
};

export type EmbeddedStyleSeatCandidate = {
  confidence: number;
  detectedFields: string[];
  candidatePath: string;
  objectPreview: Record<string, unknown>;
};

export type StyleSeatNextFlightData = {
  links: string[];
  possibleProfileSlugs: string[];
  readableSnippets: string[];
};

export type EmbeddedStyleSeatData = {
  scriptsIndex: StyleSeatScriptIndexEntry[];
  embeddedJson: EmbeddedStyleSeatBlob[];
  jsonLd: EmbeddedStyleSeatBlob[];
  candidateObjects: EmbeddedStyleSeatCandidate[];
  nextDataFound: boolean;
  nextFlightFound: boolean;
  nextFlight: StyleSeatNextFlightData;
};

export function extractScriptContents(html: string): Array<{ attributes: string; content: string }> {
  const scripts: Array<{ attributes: string; content: string }> = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    scripts.push({ attributes: match[1] ?? "", content: (match[2] ?? "").trim() });
  }
  return scripts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function candidateFields(value: Record<string, unknown>): string[] {
  const aliases = [
    "name", "firstName", "lastName", "displayName", "businessName",
    "profileUrl", "url", "slug", "city", "state", "rating", "reviewCount",
    "services", "specialties", "professionalId", "providerId", "userId",
  ];
  const keys = new Set(Object.keys(value));
  const matched = aliases.filter((field) => keys.has(field));
  if (keys.has("provider_id")) matched.push("providerId");
  if (keys.has("professional_id")) matched.push("professionalId");
  if (keys.has("user_id")) matched.push("userId");
  if (keys.has("average_rating")) matched.push("rating");
  if (keys.has("num_ratings")) matched.push("reviewCount");
  if (keys.has("matched_services")) matched.push("services");
  if (keys.has("vanity_url")) matched.push("slug");
  if (keys.has("provider_name")) matched.push("name");
  if (isRecord(value.location)) {
    const locationKeys = new Set(Object.keys(value.location));
    if (locationKeys.has("city")) matched.push("city");
    if (locationKeys.has("state")) matched.push("state");
  }
  if (isRecord(value.matched_salon)) matched.push("businessName");
  return Array.from(new Set(matched));
}

function previewObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).slice(0, 30));
}

function findCandidateObjects(
  value: unknown,
  pathLabel = "$",
  out: EmbeddedStyleSeatCandidate[] = [],
  seen = new WeakSet<object>(),
): EmbeddedStyleSeatCandidate[] {
  if (!value || typeof value !== "object") return out;
  if (seen.has(value)) return out;
  seen.add(value);

  if (Array.isArray(value)) {
    value.slice(0, 500).forEach((item, index) => findCandidateObjects(item, `${pathLabel}[${index}]`, out, seen));
    return out;
  }

  const record = value as Record<string, unknown>;
  const detectedFields = candidateFields(record);
  if (detectedFields.length >= 2) {
    out.push({
      confidence: Math.min(100, detectedFields.length * 12),
      detectedFields,
      candidatePath: pathLabel,
      objectPreview: previewObject(record),
    });
  }

  for (const [key, child] of Object.entries(record).slice(0, 500)) {
    if (child && typeof child === "object") findCandidateObjects(child, `${pathLabel}.${key}`, out, seen);
  }
  return out;
}

function extractJsonLookingPayloads(text: string): unknown[] {
  const payloads: unknown[] = [];
  const jsonParseRe = /JSON\.parse\(\s*(['"`])([\s\S]{20,20000}?)\1\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = jsonParseRe.exec(text))) {
    try {
      payloads.push(JSON.parse(match[2].replace(/\\"/g, "\"").replace(/\\n/g, "\n")));
    } catch {
      // Not clean JSON.
    }
  }
  const objectRe = /({(?=[\s\S]{0,2000}(?:provider|professional|profile|services|rating|review|city|state))[\s\S]{50,5000}?})/gi;
  while ((match = objectRe.exec(text)) && payloads.length < 40) {
    try {
      payloads.push(JSON.parse(match[1]));
    } catch {
      // Noisy JavaScript object or partial JSON.
    }
  }
  return payloads;
}

function markerList(attributes: string, content: string): string[] {
  const haystack = `${attributes}\n${content}`;
  return [
    "__NEXT_DATA__", "self.__next_f.push", "__INITIAL_STATE__", "__APOLLO_STATE__",
    "application/ld+json", "graphql", "api", "search", "professionals",
    "providers", "stylists", "marketplace", "booking",
  ].filter((marker) => haystack.toLowerCase().includes(marker.toLowerCase()));
}

function parseNextFlightData(html: string): StyleSeatNextFlightData {
  const rawLinks = [
    ...Array.from(html.matchAll(/https?:\\?\/\\?\/(?:www\.)?styleseat\.com\\?\/m\\?\/[A-Za-z0-9_-]+/gi)).map((match) => match[0]),
    ...Array.from(html.matchAll(/(?<![A-Za-z0-9_-])\/m\/[A-Za-z0-9_-]+/g)).map((match) => match[0]),
  ].map((value) => value.replace(/\\\//g, "/").replace(/\\u002F/gi, "/"));

  const links = Array.from(new Set(rawLinks.filter((value) => {
    const lower = value.toLowerCase();
    return !["/m", "/m/"].includes(lower)
      && !lower.includes("/m/search")
      && !lower.includes("/m/signup")
      && !lower.includes("/m/login")
      && !lower.includes("/m/appointments")
      && !lower.includes("/m/for-professionals");
  })));

  const possibleProfileSlugs = links.flatMap((link) => {
    const match = link.match(/\/m\/(?:p\/|v\/)?([A-Za-z0-9_-]+)/);
    return match?.[1] ? [match[1]] : [];
  });

  const readableSnippets = Array.from(html.matchAll(/"([^"]{3,180})"/g))
    .map((match) => match[1].replace(/\\u002F/gi, "/").replace(/\\"/g, "\""))
    .filter((value) => /styleseat|\/m\/|provider|professional|search|braid|booking|denver|city|state/i.test(value))
    .slice(0, 250);

  return {
    links,
    possibleProfileSlugs: Array.from(new Set(possibleProfileSlugs)).slice(0, 100),
    readableSnippets: Array.from(new Set(readableSnippets)).slice(0, 200),
  };
}

export function extractEmbeddedStyleSeatData(html: string): EmbeddedStyleSeatData {
  const embeddedJson: EmbeddedStyleSeatBlob[] = [];
  const jsonLd: EmbeddedStyleSeatBlob[] = [];
  const candidateObjects: EmbeddedStyleSeatCandidate[] = [];
  const scripts = extractScriptContents(html);
  const scriptsIndex = scripts.map((script, index) => {
    const attrs = script.attributes;
    return {
      index,
      attributes: attrs.trim(),
      src: attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1],
      type: attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1],
      id: attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1],
      textLength: script.content.length,
      first500: script.content.slice(0, 500),
      markersFound: markerList(attrs, script.content),
    };
  });

  for (const script of scripts) {
    const attrs = script.attributes;
    const content = script.content;
    if (!content) continue;
    const lowerAttrs = attrs.toLowerCase();
    let sourceType: string | null = null;
    if (attrs.includes("__NEXT_DATA__")) sourceType = "__NEXT_DATA__";
    else if (lowerAttrs.includes("application/ld+json")) sourceType = "application/ld+json";
    else if (lowerAttrs.includes("application/json")) sourceType = "script[type=application/json]";
    else if (content.includes("__APOLLO_STATE__")) sourceType = "window.__APOLLO_STATE__";
    else if (content.includes("__INITIAL_STATE__")) sourceType = "window.__INITIAL_STATE__";
    else if (content.includes("JSON.parse(")) sourceType = "JSON.parse";

    if (!sourceType) {
      for (const payload of extractJsonLookingPayloads(content)) {
        findCandidateObjects(payload, "$.scriptPayload", candidateObjects);
      }
      continue;
    }

    const blob: EmbeddedStyleSeatBlob = {
      sourceType,
      attributes: attrs.trim(),
      length: content.length,
      snippet: content.slice(0, 4000),
    };
    if (sourceType === "__NEXT_DATA__" || sourceType === "application/ld+json" || sourceType === "script[type=application/json]") {
      try {
        blob.parsed = JSON.parse(content);
        findCandidateObjects(blob.parsed, `$.${sourceType}`, candidateObjects);
      } catch {
        // Keep snippet.
      }
    }
    if (sourceType === "application/ld+json") jsonLd.push(blob);
    else embeddedJson.push(blob);
  }

  const globalPatterns: Array<[string, RegExp]> = [
    ["window.__APOLLO_STATE__", /__APOLLO_STATE__\s*=\s*({[\s\S]{0,20000}?});/],
    ["window.__INITIAL_STATE__", /__INITIAL_STATE__\s*=\s*({[\s\S]{0,20000}?});/],
    ["JSON.parse", /JSON\.parse\(\s*(['"`])([\s\S]{0,20000}?)\1\s*\)/],
  ];
  for (const [sourceType, re] of globalPatterns) {
    const match = html.match(re);
    if (!match) continue;
    const content = match[2] ?? match[1] ?? match[0];
    const blob: EmbeddedStyleSeatBlob = { sourceType, length: content.length, snippet: content.slice(0, 4000) };
    try {
      blob.parsed = JSON.parse(content);
      findCandidateObjects(blob.parsed, `$.${sourceType}`, candidateObjects);
    } catch {
      // Keep snippet.
    }
    embeddedJson.push(blob);
  }

  return {
    scriptsIndex,
    embeddedJson,
    jsonLd,
    candidateObjects: candidateObjects.sort((a, b) => b.confidence - a.confidence).slice(0, 100),
    nextDataFound: html.includes("__NEXT_DATA__"),
    nextFlightFound: html.includes("self.__next_f.push"),
    nextFlight: parseNextFlightData(html),
  };
}
