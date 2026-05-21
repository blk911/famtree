/**
 * List users with tenant_id or owned studios (find demo wiring).
 * npx tsx scripts/list-studio-user-bindings.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const withTenant = await prisma.user.findMany({
    where: { tenantId: { not: null } },
    select: { email: true, firstName: true, lastName: true, tenantId: true, role: true },
  });
  const owners = await prisma.studio.findMany({
    select: { slug: true, name: true, owner: { select: { email: true, firstName: true, lastName: true } } },
  });
  console.log("users.tenant_id set:", withTenant);
  console.log("studio owners:", owners);
}

main()
  .finally(() => prisma.$disconnect());
