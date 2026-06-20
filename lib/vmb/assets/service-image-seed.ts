export function getDateSeed(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function hashStringToPositiveInt(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSeededIndex(
  seedParts: Array<string | number | undefined | null>,
  length: number,
): number {
  if (length <= 0) return 0;
  const seed = seedParts
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .join("|");
  return hashStringToPositiveInt(seed || "vmb-service-photo") % length;
}
