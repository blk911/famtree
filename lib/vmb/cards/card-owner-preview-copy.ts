/** Owner identity copy for card preview — admin draft only, not persisted. */
export function buildOwnerPreviewCaption(ownerName?: string): string | undefined {
  const name = ownerName?.trim();
  if (!name) return undefined;
  return `A note from ${name}`;
}

export function buildOwnerPreviewCaptionShort(ownerName?: string): string | undefined {
  const name = ownerName?.trim();
  if (!name) return undefined;
  return `From ${name}`;
}

export function ownerPreviewInitial(ownerName?: string): string | undefined {
  const name = ownerName?.trim();
  if (!name) return undefined;
  return name.charAt(0).toUpperCase();
}
