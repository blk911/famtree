/**
 * Seeds Deborah Flook, Deb Dazzle studio, and service tiers.
 * Run after: npx prisma db push   (or migrate)
 *
 * Uses DATABASE_URL from .env / .env.local (same resolution as Next.js via @next/env).
 *
 * Usage: npm run seed:deb
 */
import { loadEnvConfig } from "@next/env";
import pg from "pg";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const { Client } = pg;

const STUDIO_ID = "deb-dazzle";
const EMAIL = "deb@debdazzles.com";
const PASSWORD = "DebDazzle123!";

const TIERS: { name: string; price: number | null; sortOrder: number }[] = [
  { name: "Clean Set", price: 55, sortOrder: 0 },
  { name: "Polished Set", price: 85, sortOrder: 1 },
  { name: "Statement Set", price: 115, sortOrder: 2 },
  { name: "Full Experience", price: 175, sortOrder: 3 },
  { name: "My Style", price: null, sortOrder: 4 },
];

async function hasColumn(client: pg.Client, tableName: string, columnName: string): Promise<boolean> {
  const r = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    [tableName, columnName],
  );
  return Boolean(r.rows[0]?.exists);
}

async function hasTable(client: pg.Client, tableName: string): Promise<boolean> {
  const r = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName],
  );
  return Boolean(r.rows[0]?.exists);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const hasTenantIdCol = await hasColumn(client, "users", "tenant_id");

    let userId: string;
    const existing = await client.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [EMAIL]);

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      if (hasTenantIdCol) {
        await client.query(
          `UPDATE users SET
            "passwordHash" = $1,
            "firstName" = $2,
            "lastName" = $3,
            role = $4,
            tenant_id = $5,
            "updatedAt" = NOW()
          WHERE id = $6`,
          [passwordHash, "Deborah", "Flook", "owner", STUDIO_ID, userId],
        );
      } else {
        await client.query(
          `UPDATE users SET
            "passwordHash" = $1,
            "firstName" = $2,
            "lastName" = $3,
            role = $4,
            "updatedAt" = NOW()
          WHERE id = $5`,
          [passwordHash, "Deborah", "Flook", "owner", userId],
        );
        console.warn("users.tenant_id missing — run `npx prisma db push` then re-run to set tenant.");
      }
    } else if (hasTenantIdCol) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (
          id,
          email,
          "passwordHash",
          "firstName",
          "lastName",
          role,
          status,
          tenant_id,
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          'active',
          $6,
          NOW(),
          NOW()
        )
        RETURNING id`,
        [EMAIL, passwordHash, "Deborah", "Flook", "owner", STUDIO_ID],
      );
      userId = inserted.rows[0].id;
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (
          id,
          email,
          "passwordHash",
          "firstName",
          "lastName",
          role,
          status,
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          'active',
          NOW(),
          NOW()
        )
        RETURNING id`,
        [EMAIL, passwordHash, "Deborah", "Flook", "owner"],
      );
      userId = inserted.rows[0].id;
      console.warn("users.tenant_id missing — run `npx prisma db push` then re-run to set tenant.");
    }

    if (!(await hasTable(client, "studios")) || !(await hasTable(client, "studio_service_tiers"))) {
      throw new Error(
        "Tables `studios` / `studio_service_tiers` not found. Apply schema first: npx prisma db push",
      );
    }

    await client.query(
      `INSERT INTO studios (id, name, slug, "ownerId", tagline, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         "ownerId" = EXCLUDED."ownerId",
         tagline = EXCLUDED.tagline,
         "updatedAt" = NOW()`,
      [STUDIO_ID, "Deb Dazzle", STUDIO_ID, userId, "My Private Client Network"],
    );

    for (const t of TIERS) {
      await client.query(
        `INSERT INTO studio_service_tiers (id, "studioId", name, price, "sortOrder")
         SELECT gen_random_uuid()::text, $1, $2, $3, $4
         WHERE NOT EXISTS (
           SELECT 1 FROM studio_service_tiers s
           WHERE s."studioId" = $1 AND s.name = $2
         )`,
        [STUDIO_ID, t.name, t.price, t.sortOrder],
      );
    }

    console.log("Deb seeded successfully");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
