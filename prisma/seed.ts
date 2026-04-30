// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  console.log("🌳 Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

