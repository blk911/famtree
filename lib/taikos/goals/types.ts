export type TaikosGoalCategory =
  | "PCN_GROWTH"
  | "REFERRALS"
  | "REACTIVATION"
  | "OPEN_SLOT_FILL"
  | "REVENUE"
  | "CLIENT_RETENTION"
  | "CUSTOM";

export type TaikosGoalPriority = "low" | "medium" | "high";

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
  deadline?: string;
  priority?: TaikosGoalPriority;
  notes?: string;
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
  deadline?: string;
  priority?: TaikosGoalPriority;
  notes?: string;
};

export type TaikosGoalSummary = {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  archivedGoals: number;
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
  deadline?: string;
  priority?: TaikosGoalPriority;
  notes?: string;
  linkedDrafts?: string[];
};
