import type { OutreachMessagePreset, OutreachMessagePresetId } from "./outreach-message-presets";

export type SalonOutreachPreset = OutreachMessagePreset & {
  active: boolean;
  isDefault: boolean;
  salonId?: string;
  updatedAt: string;
};

export type UpsertOutreachPresetInput = {
  id: OutreachMessagePresetId;
  label?: string;
  description?: string;
  subjectTemplate?: string;
  messageTemplate?: string;
  lockedFooterTemplate?: string;
  primaryCtaLabel?: string;
  channelHintSms?: string;
  channelHintEmail?: string;
  active?: boolean;
};
