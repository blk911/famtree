// lib/studios/prospects/opportunity-classifier.ts
// Heuristic relationship-opportunity classifier for discovered operators.

import { classifyPlatformSignals, type PlatformSignal } from "./platform-signals";
import type { BusinessCategory, RelationshipOpportunityType } from "./opportunity-taxonomy";

export interface RelationshipOpportunityInput {
  handle?: string;
  displayName?: string;
  bio?: string;
  description?: string;
  sourceHashtags?: string[];
  sourcePath?: string;
  bestUrl?: string;
  allMatchedUrls?: string[];
  platforms?: string[];
  evidence?: unknown[];
  vertical?: string;
  category?: string;
  subcategory?: string;
  educationType?: string | null;
  audienceType?: string | null;
}

export interface RelationshipOpportunityClassification {
  businessCategory: BusinessCategory;
  businessSubcategory: string;
  relationshipOpportunityType: RelationshipOpportunityType;
  relationshipScore: number;
  audienceScore: number;
  operationalDataScore: number;
  communityScore: number;
  overallOpportunityScore: number;
  offerFitTags: string[];
  platformSignals: PlatformSignal[];
  categoryConfidence: number;
  classificationNotes: string[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function evidenceText(evidence: unknown[] = []): string {
  return evidence.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return Object.values(item as Record<string, unknown>).join(" ");
    return "";
  }).join(" ");
}

function has(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function explicitSourceSignalText(input: RelationshipOpportunityInput): string {
  const evidence = evidenceText(input.evidence).toLowerCase();
  const categoryMatches = Array.from(evidence.matchAll(/category:\s*([^"\n\r]+)/g))
    .map((match) => match[1])
    .join(" ");

  return [
    input.sourcePath,
    ...(input.sourceHashtags ?? []),
    categoryMatches,
  ].filter(Boolean).join(" ").toLowerCase();
}

function deriveCategory(text: string, input: RelationshipOpportunityInput): { category: BusinessCategory; subcategory: string; confidence: number; notes: string[] } {
  const notes: string[] = [];
  const categoryText = [input.category, input.subcategory, input.vertical, input.educationType, input.audienceType, text].join(" ").toLowerCase();
  const sourceSignalText = explicitSourceSignalText(input);

  const match = (category: BusinessCategory, subcategory: string, confidence: number, reason: string) => {
    notes.push(reason);
    return { category, subcategory, confidence, notes };
  };

  if (has(sourceSignalText, ["visual art", "denverartist", "coloradoartist", "artist", "painting", "painter", "illustration", "oil pastel"])) {
    const sub = has(sourceSignalText, ["watercolor"]) ? "watercolor_artist" : has(sourceSignalText, ["illustration"]) ? "illustrator" : has(sourceSignalText, ["painting", "painter", "oil pastel"]) ? "painter" : "artist";
    return match("artist_creator", sub, 90, "Explicit artist or visual-art source signal detected");
  }
  if (has(sourceSignalText, ["fitness & wellness", "denvertrainer", "personal trainer", "fitness", "trainer", "gym"])) {
    return match("fitness_wellness", has(sourceSignalText, ["yoga"]) ? "yoga" : "personal_trainer", 88, "Explicit fitness or trainer source signal detected");
  }
  if (has(sourceSignalText, ["math tutor", "science tutor", "reading tutor", "test prep", "homeschool", "tutor", "teacher"])) {
    const sub = has(sourceSignalText, ["math"]) ? "math_tutor" : has(sourceSignalText, ["science"]) ? "science_tutor" : has(sourceSignalText, ["reading"]) ? "reading_tutor" : "tutor";
    return match("education_tutor", sub, 88, "Explicit education or tutoring source signal detected");
  }

  if (has(categoryText, ["dog trainer", "groomer", "pet", "boarding", "breeder", "puppy"])) return match("pet_services", has(categoryText, ["trainer"]) ? "dog_trainer" : "pet_services", 80, "Pet service signal detected");
  if (has(categoryText, ["math tutor", "science tutor", "reading tutor", "test prep", "tutor", "lesson", "teacher", "coding teacher"])) {
    const sub = has(categoryText, ["math"]) ? "math_tutor" : has(categoryText, ["coding"]) ? "coding_teacher" : has(categoryText, ["music"]) ? "music_teacher" : "tutor";
    return match("education_tutor", sub, 84, "Education or tutoring signal detected");
  }
  if (has(categoryText, ["microschool", "co-op", "co op", "parent community", "homeschool group"])) return match("homeschool_microschool", "microschool", 88, "Homeschool or microschool signal detected");
  if (has(categoryText, ["braid", "loc", "lash", "brow", "barber", "nail", "makeup", "stylist", "salon", "hair", "extensions"])) {
    const sub = has(categoryText, ["braid"]) ? "braids" : has(categoryText, ["loc"]) ? "locs" : has(categoryText, ["lash"]) ? "lashes" : has(categoryText, ["barber"]) ? "barber" : has(categoryText, ["nail"]) ? "nails" : has(categoryText, ["makeup"]) ? "makeup" : "hair";
    return match("beauty_personal_care", sub, 86, "Beauty or personal-care service signal detected");
  }
  if (has(categoryText, ["botox", "filler", "inject", "med spa", "aesthetic", "laser", "facial"])) return match("medical_aesthetic", "med_spa", 82, "Medical aesthetic signal detected");
  if (has(categoryText, ["watercolor", "painter", "illustrator", "sculptor", "artist", "commission", "prints", "maker", "craft"])) {
    const sub = has(categoryText, ["watercolor"]) ? "watercolor_artist" : has(categoryText, ["illustrator"]) ? "illustrator" : has(categoryText, ["commission"]) ? "commission_artist" : "artist";
    return match("artist_creator", sub, 82, "Artist or creator signal detected");
  }
  if (has(categoryText, ["wedding", "event planner", "florist", "bridal", "venue", "caterer"])) return match("wedding_events", has(categoryText, ["photographer"]) ? "photographer" : "events", 82, "Wedding or events signal detected");
  if (has(categoryText, ["photographer", "videographer", "photo session", "portrait", "brand shoot"])) return match("photographer_videographer", "photographer", 82, "Photo/video operator signal detected");
  if (has(categoryText, ["personal trainer", "yoga", "pilates", "nutrition", "sports coach", "fitness"])) return match("fitness_wellness", has(categoryText, ["yoga"]) ? "yoga" : "personal_trainer", 80, "Fitness or wellness signal detected");
  if (has(categoryText, ["coach", "consultant", "advisor", "strategy", "career"])) return match("coach_consultant", "coach", 74, "Coaching or consulting signal detected");
  if (has(categoryText, ["shopify", "etsy", "jewelry", "apparel", "handmade", "shop"])) return match("retail_maker", has(categoryText, ["etsy"]) ? "etsy_seller" : "maker", 72, "Retail or maker signal detected");
  if (has(categoryText, ["catering", "bakery", "private chef", "food truck", "restaurant"])) return match("food_hospitality", "food_service", 72, "Food or hospitality signal detected");
  if (has(categoryText, ["cleaning", "landscaping", "repair", "organizer", "interior design"])) return match("home_services", "home_service", 70, "Home service signal detected");
  if (has(categoryText, ["music", "dance", "voice teacher", "performer", "theater"])) return match("music_performing_arts", "performing_arts", 70, "Music or performing arts signal detected");

  return match("unknown", "unknown", 25, "No confident category signal detected");
}

function scoreByTerms(text: string, terms: string[], base = 0, perTerm = 12, cap = 100): number {
  const count = terms.filter((term) => text.includes(term)).length;
  return clamp(Math.min(cap, base + count * perTerm));
}

export function classifyRelationshipOpportunity(input: RelationshipOpportunityInput): RelationshipOpportunityClassification {
  const urls = [input.bestUrl, ...(input.allMatchedUrls ?? []), ...(input.platforms ?? [])];
  const text = [
    input.handle,
    input.displayName,
    input.bio,
    input.description,
    input.sourcePath,
    input.category,
    input.subcategory,
    input.vertical,
    input.educationType,
    input.audienceType,
    ...(input.sourceHashtags ?? []),
    ...urls,
    evidenceText(input.evidence),
  ].filter(Boolean).join(" ").toLowerCase();

  const platformSignals = classifyPlatformSignals(urls);
  const category = deriveCategory(text, input);

  const relationshipTerms = ["client", "student", "patient", "member", "appointment", "lesson", "coaching", "workshop", "service", "commission", "booking", "recurring", "care", "event", "referral", "session"];
  const audienceTerms = ["followers", "creator", "artist", "educator", "coach", "content", "newsletter", "youtube", "tiktok", "instagram", "community"];
  const communityTerms = ["group", "class", "workshop", "families", "parent", "membership", "club", "event", "team", "community"];

  const relationshipScore = scoreByTerms(text, relationshipTerms, platformSignals.includes("appointment_platform") ? 45 : 25, 10);
  const audienceScore = scoreByTerms(text, audienceTerms, platformSignals.includes("creator_platform") ? 45 : 15, 10);
  const operationalDataScore = clamp(
    (platformSignals.includes("appointment_platform") ? 70 : 0) +
    (platformSignals.includes("learning_platform") ? 65 : 0) +
    (platformSignals.includes("commerce_platform") ? 55 : 0) +
    (platformSignals.includes("payment_platform") ? 45 : 0) +
    (platformSignals.includes("email_list_platform") ? 45 : 0)
  );
  const communityScore = scoreByTerms(text, communityTerms, category.category === "homeschool_microschool" ? 55 : 10, 10);

  let relationshipOpportunityType: RelationshipOpportunityType = "low_fit_unknown";
  if (platformSignals.includes("appointment_platform")) relationshipOpportunityType = "appointment_operator";
  else if (platformSignals.includes("commerce_platform")) relationshipOpportunityType = "commerce_operator";
  else if (platformSignals.includes("learning_platform") || has(text, ["class", "workshop", "lesson", "tutor"])) relationshipOpportunityType = "class_workshop_operator";
  else if (communityScore >= 55) relationshipOpportunityType = "community_operator";
  else if (audienceScore >= 60) relationshipOpportunityType = "audience_operator";
  else if (platformSignals.includes("creator_platform")) relationshipOpportunityType = "content_operator";
  else if (category.category === "wedding_events") relationshipOpportunityType = "relationship_operator";
  else if (relationshipScore >= 55) relationshipOpportunityType = "relationship_operator";

  const offerFitTags = new Set<string>();
  if (platformSignals.includes("appointment_platform")) ["private_client_network", "appointment_fill", "referral_engine", "client_reactivation"].forEach((tag) => offerFitTags.add(tag));
  if (category.category === "education_tutor" || category.category === "homeschool_microschool") ["parent_network", "student_retention", "class_workshop_sales", "referral_engine"].forEach((tag) => offerFitTags.add(tag));
  if (category.category === "artist_creator") ["collector_buyer_network", "commission_pipeline", "audience_to_customer", "event_sales", "workshop_sales"].forEach((tag) => offerFitTags.add(tag));
  if (category.category === "pet_services") ["referral_engine", "client_reactivation", "membership_growth", "community_activation"].forEach((tag) => offerFitTags.add(tag));
  if (category.category === "wedding_events") ["event_sales", "referral_engine", "private_client_network"].forEach((tag) => offerFitTags.add(tag));
  if (platformSignals.includes("commerce_platform")) offerFitTags.add("audience_to_customer");
  if (communityScore >= 60) offerFitTags.add("community_activation");

  const overallOpportunityScore = clamp(
    relationshipScore * 0.35 +
    operationalDataScore * 0.30 +
    audienceScore * 0.20 +
    communityScore * 0.15
  );

  return {
    businessCategory: category.category,
    businessSubcategory: input.subcategory ?? category.subcategory,
    relationshipOpportunityType,
    relationshipScore,
    audienceScore,
    operationalDataScore,
    communityScore,
    overallOpportunityScore,
    offerFitTags: Array.from(offerFitTags),
    platformSignals,
    categoryConfidence: category.confidence,
    classificationNotes: category.notes,
  };
}
