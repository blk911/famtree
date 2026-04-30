// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Create founder
  const passwordHash = await bcrypt.hash("password123", 12);

  const founder = await prisma.user.upsert({
    where: { email: "founder@AmiHuman.test" },
    update: {},
    create: {
      email: "founder@AmiHuman.test",
      passwordHash,
      firstName: "Jane",
      lastName: "Smith",
      role: "founder",
      emailVerified: true,
      profile: {
        create: {
          bio: "Founder of this family tree. Welcome, everyone!",
          familyRole: "parent",
          location: "Denver, CO",
          isPublicInTree: true,
        },
      },
    },
  });

  console.log(`✅ Founder created: ${founder.email} / password123`);
  console.log("🌳 Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

