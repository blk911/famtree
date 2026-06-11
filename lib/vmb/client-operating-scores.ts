/** Deterministic presentation scores for client operating surface — not ML. */
export type ClientOperatingScores = {
  relationshipScore: number;
  referralScore: number;
  retentionScore: number;
  lifetimeValue: number;
  pcnStatus: "Member" | "Invited" | "Not in PCN";
};

function hashName(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) {
    h = (h + ch.charCodeAt(0) * 17) % 997;
  }
  return h;
}

export function clientOperatingScores(clientName: string): ClientOperatingScores {
  const h = hashName(clientName);
  const pcnMod = h % 5;
  return {
    relationshipScore: 58 + (h % 38),
    referralScore: 35 + ((h * 3) % 58),
    retentionScore: 52 + ((h * 7) % 43),
    lifetimeValue: 180 + ((h * 11) % 920),
    pcnStatus: pcnMod === 0 ? "Member" : pcnMod === 1 ? "Invited" : "Not in PCN",
  };
}
