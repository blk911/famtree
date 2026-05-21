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
  version: 1,
  updatedAt: "2026-05-19T00:00:00.000Z",
  hero: {
    eyebrow: "Flagship live Studio · invite-only",
    headline: "Gap U — where future learning happens in private",
    subcopy: [
      "Homeschool pods, catch-up tutoring, robotics, and invention labs — coordinated in one trusted Studio, not a public social feed.",
      "Human guides. Family alignment. Direct parent–tutor connection.",
    ],
    pillars: [
      "Future learning",
      "Private community",
      "Human-guided learning",
      "Invention + tutoring + labs",
    ],
  },
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
  sections: [
    {
      id: "learning-pods",
      title: "Learning Pods",
      description:
        "Small cohorts by age band and subject — math recovery, writing studio, science inquiry. Pods stay private to invited families.",
      bullets: ["3–8 learners per pod", "Weekly rhythm + steward check-in", "Parent visibility by default"],
    },
    {
      id: "catch-up-labs",
      title: "Catch-Up Labs",
      description:
        "Short intensive blocks for students who need momentum — skills gaps, executive function, and confidence rebuilds.",
      bullets: ["Diagnostic intake (invite-only)", "6-week sprint plans", "Tutor notes shared with parents"],
    },
    {
      id: "robotics-ai",
      title: "Robotics & AI",
      description:
        "Hands-on invention tracks: build, code, test. AI literacy taught as toolcraft — ethics and human judgment first.",
      bullets: ["Beginner → competition pathways", "Mentor office hours", "Showcase nights for members"],
    },
    {
      id: "parent-coordination",
      title: "Parent Coordination",
      description:
        "Household calendars, carpool threads, and consent-aware announcements — one channel instead of five group texts.",
      bullets: ["Guardian-friendly defaults", "No public parent directory", "Steward-approved broadcasts"],
    },
    {
      id: "tutor-access",
      title: "Private Tutor Access",
      description:
        "Vetted tutors and instructors with governed messaging — not an open marketplace listing phone numbers on the internet.",
      bullets: ["Invite-only tutor roster", "Session notes in Resource Vault", "Request access → steward review"],
    },
    {
      id: "events-workshops",
      title: "Events & Workshops",
      description:
        "Member workshops: college essay labs, financial aid nights, maker Saturdays. Public never sees member-only details.",
      bullets: ["RSVP inside Studio", "Recording links for members", "Volunteer sign-ups scoped to Space"],
    },
    {
      id: "resource-vault",
      title: "Resource Vault",
      description:
        "Curriculum guides, lab safety checklists, and tutor playbooks — versioned for the cohort you belong to.",
      bullets: ["PDF + video refs", "No open downloads", "Updated when stewards publish"],
    },
    {
      id: "announcements",
      title: "Announcements",
      description:
        "Steward broadcasts: weather closures, lab schedule shifts, and milestone celebrations — read when you're ready.",
      bullets: ["Pinned important items", "No push-notification spam", "Archive stays searchable"],
    },
  ],
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
