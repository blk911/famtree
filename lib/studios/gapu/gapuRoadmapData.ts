/**
 * Capability roadmap distilled from legacy MLP / GAPUniv portal curriculum tabs
 * (`client/src/components/Curriculum.tsx` in uploaded zip). Editorial cleanup only —
 * no runtime dependency on the legacy Vite/Replit stack.
 */

export type GapURoadmapUnit = {
  title: string;
  detail: string;
};

export type GapURoadmapPhase = {
  id: string;
  title: string;
  summary: string;
  units: GapURoadmapUnit[];
};

export type GapURoadmapBundle = {
  version: number;
  programTitle: string;
  sourceNote: string;
  phases: GapURoadmapPhase[];
};

export const GAP_U_ROADMAP: GapURoadmapBundle = {
  version: 1,
  programTitle: "Gap U arc — discovery, direction, execution",
  sourceNote:
    "Structure and learning themes sourced from Curriculum.tsx inside project (1).zip (GET A PLAN / MLP intake). The Scheduling component was a stub (`Schedule.tsx` returned null); there was no usable machine-readable calendar.",
  phases: [
    {
      id: "phase-discover-you",
      title: "Phase 1 · Discover you",
      summary:
        "Before choosing a lane, learners map identity, relational patterns, and the fear/love fork that drives decisions.",
      units: [
        {
          title: "Weeks 1–2 · Stuck is a lie",
          detail:
            "Reframe “I don’t know” as unfinished inquiry — group reflection, journaling, and audio assignments on drivers and stuck points.",
        },
        {
          title: "Weeks 3–4 · The mirror and the mask",
          detail:
            "Separate performance from core self: labels, roles, interviews, and a filter-free self-portrait (written, visual, or spoken).",
        },
        {
          title: "Weeks 5–7 · Self, relationships, and relating skills",
          detail:
            "Love vs approval, ego patterns (F.A.C.E.D.), boundaries, non-negotiables, and a draft relationship manifesto shared in circle.",
        },
        {
          title: "Week 8 · Love or fear",
          detail:
            "Every choice as a vote; build a fear map and ask what would change if fear were not in charge.",
        },
      ],
    },
    {
      id: "phase-whats-next",
      title: "Phase 2 · What’s next",
      summary:
        "Turn inner clarity into shared direction: curiosity-first forums, then disciplined narrowing into teams and charters.",
      units: [
        {
          title: "Idea forum",
          detail:
            "Each learner shares revelations — passions, patterns, creative pulls, pain to transform, and how tools (including AI) might shape the next chapter. Peers respond with curiosity only, no unsolicited critique.",
        },
        {
          title: "From wall to mission",
          detail:
            "Winnow many ideas to a few viable ones; visioning circles; team lock-in; lightweight project charter (outcomes, needs, conflict norms).",
        },
        {
          title: "Mentor touchpoints",
          detail:
            "External mentors show up as connectors and challengers — asking hard questions, offering resources, optional micro-seeds for teams that demonstrate clarity and follow-through.",
        },
      ],
    },
    {
      id: "phase-execute",
      title: "Phase 3 · Execute",
      summary:
        "Project operating system: crisp problem, user, experiments, narrative, economics, and feedback loops — taught as durable thinking, not hype.",
      units: [
        {
          title: "Offer & value clarity",
          detail:
            "What problem, for whom, what truly delivers value, and a one-sentence promise in the user’s language plus a minimal test build.",
        },
        {
          title: "Discovery & experiments",
          detail:
            "Ideal early adopter, current workarounds, riskiest assumptions, and the smallest real-world experiment to validate or kill them.",
        },
        {
          title: "Differentiation & retention",
          detail:
            "Before/during/after journey, “hell yes” moment, meaningful differentiation, and honest view of why someone might quit after two weeks.",
        },
        {
          title: "Economics & systems",
          detail:
            "How value is captured responsibly, path to sustainability, three live metrics, operational bottlenecks, and feedback the team has been slow to act on.",
        },
      ],
    },
    {
      id: "phase-obstacles",
      title: "Capstone lens · Obstacles (solving for “X”)",
      summary:
        "Name the hidden 20% — skill gaps, market twists, fear, missing systems — and practice choosing growth over retreat with mentor prompts.",
      units: [
        {
          title: "Spot the X",
          detail:
            "The unpredictable constraint where vision meets limits; use prompts to name the current X, the avoided conversation, and who already solved it.",
        },
        {
          title: "Choose the path",
          detail:
            "Every founder hits friction; default response is a choice between learning through the obstacle or excusing it — make that tradeoff explicit.",
        },
      ],
    },
  ],
};
