import { classifyRelationshipOpportunity } from "../lib/studios/prospects/opportunity-classifier";

type Expected = {
  name: string;
  input: Parameters<typeof classifyRelationshipOpportunity>[0];
  category: string;
  type: string;
  tags: string[];
  minOps?: number;
};

const cases: Expected[] = [
  {
    name: "beauty stylist with StyleSeat",
    input: {
      displayName: "Denver Braids Studio",
      description: "Braids, locs, hair appointments and recurring clients",
      bestUrl: "https://www.styleseat.com/m/denverbraids",
      platforms: ["styleseat"],
    },
    category: "beauty_personal_care",
    type: "appointment_operator",
    tags: ["appointment_fill", "referral_engine", "client_reactivation"],
    minOps: 60,
  },
  {
    name: "math tutor with homeschool hashtags",
    input: {
      displayName: "Sarah Wilson Math Tutoring",
      description: "Math tutor lessons for homeschool families and students",
      sourceHashtags: ["homeschool", "mathtutor"],
    },
    category: "education_tutor",
    type: "class_workshop_operator",
    tags: ["parent_network", "student_retention"],
  },
  {
    name: "watercolor artist with Linktree and Etsy",
    input: {
      displayName: "Mia Watercolor Studio",
      description: "Watercolor artist, commissions, prints, workshops",
      allMatchedUrls: ["https://linktr.ee/miawatercolor", "https://etsy.com/shop/miawatercolor"],
      platforms: ["linktree", "etsy"],
    },
    category: "artist_creator",
    type: "commerce_operator",
    tags: ["audience_to_customer", "collector_buyer_network", "commission_pipeline"],
  },
  {
    name: "dog trainer with booking link",
    input: {
      displayName: "Good Dog Training",
      description: "Dog trainer classes, private lessons, community puppy workshops",
      bestUrl: "https://calendly.com/gooddogtraining",
    },
    category: "pet_services",
    type: "appointment_operator",
    tags: ["community_activation", "referral_engine"],
  },
  {
    name: "wedding photographer",
    input: {
      displayName: "Luna Wedding Photography",
      description: "Wedding photographer, bridal events, engagement sessions, referrals",
      bestUrl: "https://luna.squarespace.com",
    },
    category: "wedding_events",
    type: "relationship_operator",
    tags: ["event_sales", "referral_engine"],
  },
];

let failures = 0;

for (const test of cases) {
  const result = classifyRelationshipOpportunity(test.input);
  const missingTags = test.tags.filter((tag) => !result.offerFitTags.includes(tag));
  const ok =
    result.businessCategory === test.category &&
    result.relationshipOpportunityType === test.type &&
    missingTags.length === 0 &&
    (test.minOps === undefined || result.operationalDataScore >= test.minOps);

  console.log(JSON.stringify({
    name: test.name,
    ok,
    expected: { category: test.category, type: test.type, tags: test.tags },
    actual: {
      businessCategory: result.businessCategory,
      businessSubcategory: result.businessSubcategory,
      relationshipOpportunityType: result.relationshipOpportunityType,
      overallOpportunityScore: result.overallOpportunityScore,
      operationalDataScore: result.operationalDataScore,
      offerFitTags: result.offerFitTags,
      platformSignals: result.platformSignals,
    },
    missingTags,
  }, null, 2));

  if (!ok) failures++;
}

if (failures > 0) {
  console.error(`${failures} classifier validation case(s) failed`);
  process.exit(1);
}

console.log("Opportunity classifier validation passed");
