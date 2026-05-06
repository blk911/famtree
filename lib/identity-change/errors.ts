import { Prisma } from "@prisma/client";

/** True when Prisma reports missing identity-change tables/columns (migration not applied). */
export function isIdentityChangeSchemaMissing(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P2021" || err.code === "P2022";
  }
  return false;
}
