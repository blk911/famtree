function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** @deprecated Prefer buildTodayGreeting from today-conversation for Today UI. */
export function greetingForOperator(salonName: string, operatorName?: string): string {
  const hour = new Date().getHours();
  let period: "Morning" | "Afternoon" | "Evening";
  if (hour >= 5 && hour < 12) period = "Morning";
  else if (hour >= 12 && hour < 17) period = "Afternoon";
  else period = "Evening";
  const who = operatorName ? firstName(operatorName) : firstName(salonName);
  return `Good ${period} ${who}`;
}
