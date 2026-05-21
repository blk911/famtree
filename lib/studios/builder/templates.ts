import type { StudioTemplateType } from "@/types/studios/builder";

export type StudioBuilderTemplateMeta = {
  id: StudioTemplateType;
  title: string;
  description: string;
  audience: string;
  publicPreviewDefault: boolean;
  triadLensId?: "studio-network" | "client-network" | "family-learning";
};

export const STUDIO_BUILDER_TEMPLATES: readonly StudioBuilderTemplateMeta[] = [
  {
    id: "private-studio-network",
    title: "Private Studio Network",
    description: "Member-only updates without public social noise.",
    audience: "Creators, coaches, tight member circles",
    publicPreviewDefault: true,
    triadLensId: "studio-network",
  },
  {
    id: "private-client-network",
    title: "Private Client Network",
    description: "Professional client cohorts and booking-adjacent businesses.",
    audience: "Salons, trainers, service providers",
    publicPreviewDefault: true,
    triadLensId: "client-network",
  },
  {
    id: "family-learning",
    title: "Family & Learning Space",
    description: "Families, co-ops, and parent-led learning groups.",
    audience: "Parents, tutors, learning pods",
    publicPreviewDefault: false,
    triadLensId: "family-learning",
  },
  {
    id: "executive-work",
    title: "Executive Strategy Space",
    description: "Confidential leadership and board-style groups.",
    audience: "Executives, boards, strategy peers",
    publicPreviewDefault: false,
  },
  {
    id: "local-community",
    title: "Local Community / Church / PTA",
    description: "Churches, PTAs, clubs, and neighborhood volunteers.",
    audience: "Community organizers and local groups",
    publicPreviewDefault: true,
  },
  {
    id: "gap-u-learning-lab",
    title: "Gap U / Learning Lab",
    description: "Homeschool, tutoring, labs, and parent coordination.",
    audience: "Families, students, tutors, instructors",
    publicPreviewDefault: false,
    triadLensId: "family-learning",
  },
] as const;

export function getStudioBuilderTemplate(
  id: StudioTemplateType,
): StudioBuilderTemplateMeta | undefined {
  return STUDIO_BUILDER_TEMPLATES.find((t) => t.id === id);
}

export function isStudioTemplateType(value: string): value is StudioTemplateType {
  return STUDIO_BUILDER_TEMPLATES.some((t) => t.id === value);
}
