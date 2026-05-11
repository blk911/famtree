// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildDefaultPolicyProfile } from "@/lib/aihsafe/policy/defaults";
import { AgeTier } from "@/types/aihsafe/age-tiers";
import { PolicySourceType } from "@/types/aihsafe/policy";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Create founder
  const passwordHash = await bcrypt.hash("whisper", 12);

  const founder = await prisma.user.upsert({
    where: { email: "admin@amihuman.net" },
    update: {},
    create: {
      email: "admin@amihuman.net",
      passwordHash,
      firstName: "Admin",
      lastName: "AMIHUMAN",
      role: "founder",
      emailVerified: true,
      profile: {
        create: {
          bio: "Founder of AMIHUMAN.NET. Welcome, everyone!",
          familyRole: "parent",
          location: "Denver, CO",
          isPublicInTree: true,
        },
      },
    },
  });

  console.log(`✅ Founder created: ${founder.email} / whisper`);

  // Create a policy profile for the seed founder (explicit ADULT tier — no DOB provided).
  const founderPolicy = buildDefaultPolicyProfile(
    founder.id,
    AgeTier.ADULT,
    null, // no AihFounderSettings row exists at seed time
    PolicySourceType.SYSTEM_DEFAULT,
  );
  await prisma.aihPolicyProfile.upsert({
    where:  { userId: founder.id },
    create: {
      userId:          founder.id,
      ageTierSnapshot: founderPolicy.ageTierSnapshot,
      sourceType:      founderPolicy.sourceType,
      postingPolicy:   founderPolicy.posting    as object,
      invitePolicy:    founderPolicy.invite     as object,
      visibilityPolicy:founderPolicy.visibility as object,
      escalationPolicy:founderPolicy.escalation as object,
      interestsPolicy: founderPolicy.interests  as object,
      limitsPolicy:    founderPolicy.limits     as object,
    },
    update: {},
  });
  console.log("✅ Founder policy profile created (ADULT tier, system defaults).");
  console.log("🌳 Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

