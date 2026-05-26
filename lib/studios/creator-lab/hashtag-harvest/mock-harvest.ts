// lib/studios/creator-lab/hashtag-harvest/mock-harvest.ts
// Synthetic creator seed generator — used when HARVEST_MOCK=true or Apify is unavailable.
// Produces realistic-looking seeds so the resolver/prospect pipeline can run end-to-end.

import type { ApifyPost } from "./types";

const MOCK_HANDLES_BY_KEYWORD: Record<string, string[]> = {
  homeschool:       ["the.grace.schoolroom", "wildoaklearning", "cozycottageschool", "joyfulhomeschoolmom", "morningbasketlife"],
  classicaleducation: ["veritas.voices", "classicalconversationslife", "anchorschoolhouse", "triviumpursuits", "rhetoricroomco"],
  charlottemason:   ["ambleside.life", "livingbooksmama", "naturestudynotes", "cmterraceschool", "simplycharlottemason"],
  unschooling:      ["freerangelearners", "worldisourtextbook", "unschoolersunited", "naturalkidsco", "selfdirectedkids"],
  learningpod:      ["denverlearningpod", "blueprintpodco", "microschoolhub", "villagelearningpod", "connecticutpod"],
  microschool:      ["springbranchacademy", "brooksidemicroschool", "thehivelearning", "gatheredroots.edu", "stonecroft.school"],
  nails:            ["nailsbybrielle", "lux.nailbar", "pinkpetalnails", "chrometippednails", "nailsbyvalencia"],
  lashes:           ["lashlounge.co", "flutter.lash.studio", "velvetlashco", "lashartbynaomi", "goldenratio.lashes"],
  hair:             ["theblondemethod", "salonbyvivienne", "colorcoreraleigh", "hairbymadisontx", "luxelocksstudio"],
  denver:           ["denversalon.co", "miledenhair", "cherry.creek.nails", "lohi.beauty", "rino.lashbar"],
  fitness:          ["coachedbybre", "ironrosetx", "functionalfitnessdfw", "movewithtaylor", "alphamomfitness"],
};

const MOCK_DISPLAY_NAMES: Record<string, string> = {
  "the.grace.schoolroom":     "Grace & Co. Schoolroom",
  "wildoaklearning":          "Wild Oak Learning",
  "cozycottageschool":        "Cozy Cottage School",
  "joyfulhomeschoolmom":      "Joyful Homeschool Mom",
  "morningbasketlife":        "Morning Basket Life",
  "veritas.voices":           "Veritas Voices",
  "classicalconversationslife": "Classical Conversations Life",
  "anchorschoolhouse":        "Anchor Schoolhouse",
  "triviumpursuits":          "Trivium Pursuits",
  "rhetoricroomco":           "The Rhetoric Room",
  "ambleside.life":           "Ambleside Life",
  "livingbooksmama":          "Living Books Mama",
  "naturestudynotes":         "Nature Study Notes",
  "cmterraceschool":          "CM Terrace School",
  "simplycharlottemason":     "Simply Charlotte Mason",
};

const MOCK_CAPTIONS = [
  "Building lifelong learners one morning basket at a time ✨ #homeschool",
  "Classical education changed everything for our family 📚",
  "Pod learning is the future of education 🌱",
  "Our microschool journey — year 2! So grateful for this community.",
  "Charlotte Mason methods + nature study = magic every morning",
];

function pickHandles(hashtag: string, count: number): string[] {
  const key = Object.keys(MOCK_HANDLES_BY_KEYWORD).find((k) =>
    hashtag.toLowerCase().includes(k)
  );
  const pool = key
    ? MOCK_HANDLES_BY_KEYWORD[key]
    : MOCK_HANDLES_BY_KEYWORD["homeschool"];

  // Shuffle deterministically by hashtag to get consistent results
  const seed = hashtag.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...pool].sort((a, b) => {
    const ha = (a.charCodeAt(0) + seed) % 97;
    const hb = (b.charCodeAt(0) + seed) % 97;
    return ha - hb;
  });

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function generateMockPosts(hashtags: string[], maxPerHashtag: number): ApifyPost[] {
  const posts: ApifyPost[] = [];

  for (const hashtag of hashtags) {
    const handles = pickHandles(hashtag, maxPerHashtag);
    for (const handle of handles) {
      const caption = MOCK_CAPTIONS[Math.floor(Math.random() * MOCK_CAPTIONS.length)];
      posts.push({
        ownerUsername: handle,
        ownerFullName: MOCK_DISPLAY_NAMES[handle] ?? handle.replace(/[._]/g, " "),
        caption,
        hashtags: [hashtag, "homeschool", "education", "learningathome"],
        url: `https://www.instagram.com/p/mock-${handle.slice(0, 8)}/`,
        shortCode: `mock-${handle.slice(0, 8)}`,
        imageUrl: null,
        timestamp: new Date().toISOString(),
        likesCount: Math.floor(Math.random() * 500) + 10,
        commentsCount: Math.floor(Math.random() * 50) + 1,
      });
    }
  }

  return posts;
}
