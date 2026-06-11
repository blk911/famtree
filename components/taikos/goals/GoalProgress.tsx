"use client";

type Props = {
  percent: number;
  label?: string;
};

export function GoalProgress({ percent, label }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="taikos-goal-progress">
      {label ? <p className="taikos-goal-progress__label">{label}</p> : null}
      <div className="taikos-goal-progress__track" aria-hidden>
        <div className="taikos-goal-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      <p className="taikos-goal-progress__pct">{clamped}%</p>
    </div>
  );
}
