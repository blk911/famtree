import type { VmbInviteTemplate } from "./invite-template-types";

export function selectInviteTemplateId(
  draftIds: readonly string[],
  templateId: string,
  currentId: string,
): string {
  return draftIds.includes(templateId) ? templateId : currentId;
}

export function getSelectedInviteDraft(
  drafts: Record<string, VmbInviteTemplate>,
  selectedTemplateId: string,
): VmbInviteTemplate | undefined {
  return drafts[selectedTemplateId];
}

export function patchInviteDraftRecord(
  drafts: Record<string, VmbInviteTemplate>,
  templateId: string,
  patch: Partial<VmbInviteTemplate>,
): Record<string, VmbInviteTemplate> {
  const current = drafts[templateId];
  if (!current) return drafts;
  return {
    ...drafts,
    [templateId]: {
      ...current,
      ...patch,
      allowedOfferCategories: patch.allowedOfferCategories
        ? [...patch.allowedOfferCategories]
        : [...current.allowedOfferCategories],
    },
  };
}

export function inviteSelectionStateIsSynced(input: {
  selectedTemplateId: string;
  dropdownValue: string;
  pillSelectedId: string;
  draftTemplateId?: string;
}): boolean {
  return (
    input.selectedTemplateId === input.dropdownValue &&
    input.selectedTemplateId === input.pillSelectedId &&
    input.draftTemplateId === input.selectedTemplateId
  );
}
