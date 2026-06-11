export type TaikosGoalCategory =
  | "PCN_GROWTH"
  | "REFERRALS"
  | "REACTIVATION"
  | "OPEN_SLOT_FILL"
  | "REVENUE"
  | "CLIENT_RETENTION"
  | "CUSTOM";

export type TaikosGoalStatus = "draft" | "active" | "completed" | "paused" | "archived";

export type TaikosGoal = {
  goalId: string;
  salonId: string;
  operatorId: string;
  title: string;
  category: TaikosGoalCategory;
  targetValue: number;
  currentValue: number;
  status: TaikosGoalStatus;
  createdAt: string;
  updatedAt: string;
  opportunities: string[];
  linkedDrafts: string[];
  progressPercent: number;
};

export type TaikosGoalListItem = {
  goalId: string;
  title: string;
  category: TaikosGoalCategory;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  status: TaikosGoalStatus;
};

export type TaikosGoalSummary = {
  totalGoals: number;
  activeGoals: number;
  goals: TaikosGoalListItem[];
};

export type CreateTaikosGoalInput = Omit<
  TaikosGoal,
  "goalId" | "createdAt" | "updatedAt" | "progressPercent" | "opportunities" | "linkedDrafts"
> & {
  goalId?: string;
  opportunities?: string[];
  linkedDrafts?: string[];
};

export type UpdateTaikosGoalInput = {
  title?: string;
  category?: TaikosGoalCategory;
  targetValue?: number;
  currentValue?: number;
  status?: TaikosGoalStatus;
  linkedDrafts?: string[];
};
