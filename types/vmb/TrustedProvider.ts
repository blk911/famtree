export interface TrustedProvider {
  id: string;
  name: string;
  category: string;
  specialty?: string;
  invitedBy?: string;
  status: "active" | "pending";
}
