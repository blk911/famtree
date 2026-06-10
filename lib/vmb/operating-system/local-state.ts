const INVITED_KEY = "vmb_os_network_invited";
const JOINED_KEY = "vmb_os_network_joined";

function scopedKey(base: string, analysisId?: string): string {
  return analysisId ? `${base}:${analysisId}` : base;
}

export function readNetworkInviteState(analysisId?: string): { invited: number; joined: number } {
  if (typeof window === "undefined") return { invited: 0, joined: 0 };
  try {
    const invited = Number.parseInt(
      localStorage.getItem(scopedKey(INVITED_KEY, analysisId)) ?? "0",
      10,
    );
    const joined = Number.parseInt(
      localStorage.getItem(scopedKey(JOINED_KEY, analysisId)) ?? "0",
      10,
    );
    return {
      invited: Number.isFinite(invited) ? invited : 0,
      joined: Number.isFinite(joined) ? joined : 0,
    };
  } catch {
    return { invited: 0, joined: 0 };
  }
}

export function writeNetworkInviteState(
  analysisId: string | undefined,
  state: { invited: number; joined: number },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(INVITED_KEY, analysisId), String(state.invited));
    localStorage.setItem(scopedKey(JOINED_KEY, analysisId), String(state.joined));
  } catch {
    // ignore quota / privacy mode
  }
}
