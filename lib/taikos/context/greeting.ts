function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function greetingForOperator(salonName: string, operatorName?: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const who = operatorName ? firstName(operatorName) : firstName(salonName);
  return `Good ${period} ${who}`;
}
