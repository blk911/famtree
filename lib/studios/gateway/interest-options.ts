export const STUDIOS_ACCESS_INTEREST_OPTIONS = [
  "Private Client Network",
  "Gap U Learning Lab",
  "Family & Learning Space",
  "Executive Strategy Space",
  "General AIH Studios",
] as const;

export type StudiosAccessInterestType = (typeof STUDIOS_ACCESS_INTEREST_OPTIONS)[number];
