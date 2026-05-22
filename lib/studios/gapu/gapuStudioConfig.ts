import type { Provider } from "@/types/studios";
import { HERO_PSN_EDUCATION } from "@/lib/studios/studioIntroVideo";
import type { GapUStudioLiveContent } from "@/lib/studios/gapu/types";

export const GAP_U_SLUG = "gap-u" as const;

export const GAP_U_PROVIDER: Provider = {
  id: "gap_u_flagship",
  displayName: "Gap U Learning Lab",
  slug: GAP_U_SLUG,
  category: "trainer",
  serviceType: "Future learning · homeschool · labs",
  locationLabel: "Colorado Front Range · invite-only",
  city: "Colorado",
  state: "CO",
  imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=75",
  introVideoUrl: HERO_PSN_EDUCATION.videoSrc,
  bio: "A living private Studio for families, tutors, and invention labs — human-guided learning without public feed chaos.",
  claimed: true,
  active: true,
  studioId: "gap_u_flagship",
  createdAt: new Date("2026-01-15"),
};

/** Replace this object via CMS/API — keep shape stable. */
export const GAP_U_LIVE_CONTENT: GapUStudioLiveContent = {
  source: "mock",
  version: 2,
  updatedAt: "2026-05-22T00:00:00.000Z",
  hero: {
    eyebrow: "AIH Studios · future learning flagship",
    headline: "The next generation will not learn in public feeds.",
    subcopy: [
      "Private learning communities, human mentors, invention labs, and real-world guidance — coordinated in trusted spaces.",
    ],
  },
  roadmapPreview: {
    title: "Gap U roadmap preview",
    intro:
      "A four-phase arc (discover → direct → execute → obstacle literacy) distilled from archived MLP curriculum materials. Full detail lives on the roadmap page.",
  },
  pathways: [
    {
      id: "family-led-learning",
      pillarLabel: "Pillar 1",
      title: "Family-led learning",
      lede:
        "Small private cohorts anchored in household intent — not algorithmic timelines. Parents coordinate, tutors collaborate, learners stay grounded.",
      bullets: [
        "Homeschool pods sized for accountability",
        "Parent coordination built into the Studio rhythm",
        "Trusted tutors inside governed spaces — not open listings",
        "Safe private venues for minors and mentors",
      ],
      ctaLabel: "Build a private learning pod",
      href: "/studios/gap-u/family-led-learning",
    },
    {
      id: "business-tracks",
      pillarLabel: "Pillar 2",
      title: "Real-world business tracks",
      lede:
        "Knowledge from operators on the ground: trades, founders, local businesses — structured so apprentices can ingest context and ask sharper questions.",
      bullets: [
        "Operator transcripts and teardown patterns",
        "Business ingestion drills + disciplined answer hygiene",
        "Trades · founders · local business rotations",
        "Mentored reality checks instead of syllabus cosplay",
      ],
      ctaLabel: "Explore business tracks",
      href: "/studios/gap-u/business-tracks",
    },
    {
      id: "gap-u-program",
      pillarLabel: "Pillar 3",
      title: "Gap U",
      lede:
        "High-school graduation is a milestone, not a finish line — this pillar maps a multi-year capability stack: tooling, fabrication, reasoning, compassion.",
      bullets: [
        "Six-year capability roadmap (skills + stewardship)",
        "Invention labs with safety and publishing norms",
        "AI + tool literacy with human judgment gates",
        "Engineering · business · systems thinking as one weave",
      ],
      ctaLabel: "Enter Gap U",
      href: "/studios/gap-u/program",
    },
  ],
  whyPrivate: {
    title: "Why private learning spaces matter",
    intro:
      "Gap U is built for focus, safety, and real relationships — the opposite of algorithmic noise and anonymous DMs.",
    points: [
      {
        title: "Focused communication",
        body: "Updates stay inside your Studio — not mixed with ads, trends, or stranger comments.",
      },
      {
        title: "Safe coordination",
        body: "Parents, tutors, and lab mentors share context with clear roles and steward oversight.",
      },
      {
        title: "Family alignment",
        body: "Schedules, resources, and announcements land in one place everyone trusts.",
      },
      {
        title: "No algorithmic feed chaos",
        body: "Nothing is ranked for engagement. People you invite are who you hear from.",
      },
      {
        title: "Direct parent–tutor connection",
        body: "Ask questions, confirm progress, and adjust plans without a marketplace middleman.",
      },
    ],
  },
  announcements: [
    {
      id: "ann-1",
      postedAt: "2026-05-17T14:00:00.000Z",
      title: "Spring maker showcase — members May 24",
      body: "Robotics & AI pods will demo prototypes in the private member hall. Families: RSVP in Events; guests by steward invite only.",
      audience: "members",
    },
    {
      id: "ann-2",
      postedAt: "2026-05-14T09:30:00.000Z",
      title: "Catch-Up Lab intake open for June",
      body: "Six seats remain for the June math momentum sprint. Parents: message your pod steward before Friday.",
      audience: "parents",
    },
    {
      id: "ann-3",
      postedAt: "2026-05-10T16:00:00.000Z",
      title: "New tutor office hours posted",
      body: "Ms. Rivera added Thursday 4–6pm blocks for writing studio. Book via Private Tutor Access — members only.",
      audience: "tutors",
    },
  ],
  events: [
    {
      id: "ev-1",
      startsAt: "2026-05-24T17:00:00.000Z",
      title: "Maker showcase night",
      location: "Gap U member hall (invite)",
      description: "Student prototypes, mentor Q&A, parent roundtable.",
      access: "members",
    },
    {
      id: "ev-2",
      startsAt: "2026-06-03T10:00:00.000Z",
      title: "Homeschool planning clinic",
      location: "Virtual · Studio thread",
      description: "Align summer pacing with pod stewards and tutors.",
      access: "invite",
    },
    {
      id: "ev-3",
      startsAt: "2026-06-12T15:30:00.000Z",
      title: "Robotics scrimmage prep",
      location: "Lab B",
      description: "Pre-competition tune-up for intermediate builders.",
      access: "members",
    },
  ],
  resources: [
    {
      id: "res-1",
      title: "Pod steward handbook",
      type: "guide",
      description: "Roles, escalation, and guardian visibility defaults for learning pods.",
    },
    {
      id: "res-2",
      title: "June catch-up sprint calendar",
      type: "schedule",
      description: "Session grid and parent check-in windows for the math momentum lab.",
    },
    {
      id: "res-3",
      title: "Robotics lab safety checklist",
      type: "lab",
      description: "Tool authorization, buddy system, and incident reporting inside the Studio.",
    },
    {
      id: "res-4",
      title: "Invite-only access policy",
      type: "policy",
      description: "How request access, guardian review, and tutor onboarding work at Gap U.",
    },
  ],
};

export function getGapUStudioBundle() {
  return {
    slug: GAP_U_SLUG,
    provider: GAP_U_PROVIDER,
    content: GAP_U_LIVE_CONTENT,
  };
}
