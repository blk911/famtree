import {
  buildApplyHeroFields,
  sanitizeApplyStudioHeroFields,
} from "@/lib/studios/applyPreview";
import type { NormalizedStudioEditorProps } from "@/lib/studio/templates/normalizeStudioTemplate";

/**
 * Merge AMIHUMAN.NET account + Profile into normalized studio builder props (hero contact + provider bio/photo/map label).
 * Keeps template defaults when account fields are empty; preserves `businessName` from the template envelope.
 */
export function hydrateNormalizedStudioFromProfile(
  base: NormalizedStudioEditorProps,
  user: {
    firstName: string;
    lastName: string;
    email: string;
    photoUrl: string | null;
  },
  profile: { phone: string | null; location: string | null; bio: string | null } | null,
): NormalizedStudioEditorProps {
  const acc = buildApplyHeroFields(
    {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photoUrl: user.photoUrl,
    },
    profile ? { location: profile.location, phone: profile.phone } : null,
  );

  const hero = sanitizeApplyStudioHeroFields({
    ...base.hero,
    fullName: acc.fullName.trim() ? acc.fullName : base.hero.fullName,
    email: acc.email.trim() ? acc.email : base.hero.email,
    phone: acc.phone.trim() ? acc.phone : base.hero.phone,
    physicalAddress: acc.physicalAddress.trim() ? acc.physicalAddress : base.hero.physicalAddress,
    businessName: base.hero.businessName,
  });

  const bioTrim = profile?.bio?.trim();
  const photoTrim = user.photoUrl?.trim();

  return {
    ...base,
    hero,
    provider: {
      ...base.provider,
      bio: bioTrim && bioTrim.length > 0 ? bioTrim : base.provider.bio,
      locationLabel: hero.physicalAddress.trim()
        ? hero.physicalAddress
        : base.provider.locationLabel,
      imageUrl:
        photoTrim && photoTrim.length > 0 ? photoTrim : base.provider.imageUrl,
    },
  };
}
