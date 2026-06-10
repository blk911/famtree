import type { TrustedProvider } from "./TrustedProvider";

export interface TrustedCircle {
  salonId: string;
  salonName: string;
  providers: TrustedProvider[];
  clientCount: number;
  expansionSlots: number;
}
