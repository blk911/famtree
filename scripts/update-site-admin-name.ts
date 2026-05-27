import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "@/lib/db/prisma";
import { SITE_ADMIN_DISPLAY_NAME } from "@/lib/user/display-name";

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: { in: ["founder", "admin"] } },
    data: { firstName: "J. S.", lastName: "Wendt" },
  });
  console.log(`Updated ${result.count} founder/admin account(s) to "${SITE_ADMIN_DISPLAY_NAME}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
