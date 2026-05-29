// lib/studios/prospects/opportunity-taxonomy.ts
// Relationship-opportunity taxonomy layered on top of existing verticals.

export const BUSINESS_CATEGORIES = [
  "beauty_personal_care",
  "education_tutor",
  "homeschool_microschool",
  "fitness_wellness",
  "medical_aesthetic",
  "artist_creator",
  "photographer_videographer",
  "music_performing_arts",
  "pet_services",
  "wedding_events",
  "coach_consultant",
  "home_services",
  "food_hospitality",
  "retail_maker",
  "unknown",
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  beauty_personal_care: "Beauty & Personal Care",
  education_tutor: "Education / Tutor",
  homeschool_microschool: "Homeschool / Microschool",
  fitness_wellness: "Fitness & Wellness",
  medical_aesthetic: "Medical Aesthetic",
  artist_creator: "Artist / Creator",
  photographer_videographer: "Photo / Video",
  music_performing_arts: "Music & Performing Arts",
  pet_services: "Pet Services",
  wedding_events: "Wedding & Events",
  coach_consultant: "Coach / Consultant",
  home_services: "Home Services",
  food_hospitality: "Food & Hospitality",
  retail_maker: "Retail / Maker",
  unknown: "Unknown",
};

export const BUSINESS_SUBCATEGORIES: Record<BusinessCategory, string[]> = {
  artist_creator: ["painter", "watercolor_artist", "illustrator", "sculptor", "maker", "craft_artist", "digital_artist"],
  education_tutor: ["math_tutor", "science_tutor", "reading_tutor", "test_prep", "music_teacher", "coding_teacher"],
  fitness_wellness: ["personal_trainer", "yoga", "pilates", "nutrition", "sports_coach"],
  pet_services: ["dog_trainer", "groomer", "boarding", "breeder", "vet_adjacent"],
  wedding_events: ["photographer", "planner", "florist", "makeup", "venue", "caterer"],
  beauty_personal_care: ["hair", "braids", "barber", "locs", "lashes", "brows", "nails", "makeup", "extensions"],
  homeschool_microschool: ["microschool", "homeschool_group", "co_op", "curriculum", "parent_community"],
  medical_aesthetic: ["injectables", "skin", "med_spa", "laser", "wellness_clinic"],
  photographer_videographer: ["portrait", "wedding", "family", "brand", "event", "videographer"],
  music_performing_arts: ["music_teacher", "dance", "theater", "voice", "performer"],
  coach_consultant: ["business_coach", "life_coach", "career_coach", "consultant", "advisor"],
  home_services: ["cleaning", "landscaping", "repair", "interior_design", "organizer"],
  food_hospitality: ["catering", "private_chef", "bakery", "food_truck", "venue"],
  retail_maker: ["etsy_seller", "shopify_store", "jewelry", "apparel", "crafts"],
  unknown: [],
};

export const RELATIONSHIP_OPPORTUNITY_TYPES = [
  "relationship_operator",
  "audience_operator",
  "appointment_operator",
  "class_workshop_operator",
  "community_operator",
  "commerce_operator",
  "content_operator",
  "low_fit_unknown",
] as const;

export type RelationshipOpportunityType = typeof RELATIONSHIP_OPPORTUNITY_TYPES[number];

export const RELATIONSHIP_OPPORTUNITY_LABELS: Record<RelationshipOpportunityType, string> = {
  relationship_operator: "Relationship Operator",
  audience_operator: "Audience Operator",
  appointment_operator: "Appointment Operator",
  class_workshop_operator: "Class / Workshop Operator",
  community_operator: "Community Operator",
  commerce_operator: "Commerce Operator",
  content_operator: "Content Operator",
  low_fit_unknown: "Low Fit / Unknown",
};
