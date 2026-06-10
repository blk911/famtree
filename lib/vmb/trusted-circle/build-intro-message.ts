type BuildIntroMessageInput = {
  salonName: string;
  clientName: string;
  providerCategory: string;
  providerName?: string;
};

export function buildTrustedIntroMessage(input: BuildIntroMessageInput): string {
  const category = input.providerCategory.toLowerCase();
  const named =
    input.providerName?.trim() ?
      `your favorite ${category} provider, ${input.providerName.trim()},`
    : `your favorite ${category} provider`;

  return (
    `Hi ${input.clientName}, would you be open to introducing me to ${named}? ` +
    `${input.salonName} is building a small trusted beauty circle for clients we already love taking care of. ` +
    `If you're comfortable, just add their name and phone/email and we'll send a friendly intro you approve.`
  );
}
