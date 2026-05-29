import { promises as fs } from "fs";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";

type Backend = "postgres" | "json" | "auto";

type Options = {
  dryRun: boolean;
  confirm: boolean;
  confirmProductionReset: boolean;
  backend: Backend;
  includeRuns: boolean;
  includeRuntime: boolean;
};

type DeletePlanItem = {
  label: string;
  type: "postgres_table" | "json_file" | "runtime_dir";
  target: string;
  count: number;
  action: string;
  exists: boolean;
};

const prisma = new PrismaClient();

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const backendArg = args.find((arg) => arg.startsWith("--backend="))?.split("=")[1] ?? "auto";
  if (!["postgres", "json", "auto"].includes(backendArg)) {
    throw new Error("--backend must be postgres, json, or auto");
  }

  return {
    dryRun: args.includes("--dry-run"),
    confirm: args.includes("--confirm"),
    confirmProductionReset: args.includes("--confirm-production-reset"),
    backend: backendArg as Backend,
    includeRuns: args.includes("--include-runs"),
    includeRuntime: args.includes("--include-runtime"),
  };
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function localRuntimePath(...parts: string[]): string {
  return path.resolve(process.cwd(), "runtime-data", "studios", ...parts);
}

function tmpRuntimePath(...parts: string[]): string {
  return path.join("/tmp", ...parts);
}

function prospectJsonPath(): string {
  return process.env.VERCEL
    ? tmpRuntimePath("studios-prospects", "prospects.json")
    : localRuntimePath("prospects", "prospects.json");
}

function runtimeRoots(): Array<{ label: string; path: string }> {
  const vercel = Boolean(process.env.VERCEL);
  return [
    {
      label: "hashtag harvest run history",
      path: vercel ? tmpRuntimePath("hashtag-harvest") : localRuntimePath("hashtag-harvest"),
    },
    {
      label: "education directory run history",
      path: vercel ? tmpRuntimePath("studios-edu-directory") : localRuntimePath("education-directory"),
    },
    {
      label: "education seed run history",
      path: vercel ? tmpRuntimePath("studios-education-seeds") : localRuntimePath("education-seeds"),
    },
    {
      label: "StyleSeat run/debug history",
      path: vercel ? tmpRuntimePath("studios-styleseat") : localRuntimePath("styleseat"),
    },
  ];
}

function assertSafeRuntimeTarget(target: string): void {
  const resolved = path.resolve(target);
  const allowedLocal = path.resolve(process.cwd(), "runtime-data", "studios");
  const allowedTmpPrefixes = [
    path.resolve("/tmp/hashtag-harvest"),
    path.resolve("/tmp/studios-edu-directory"),
    path.resolve("/tmp/studios-education-seeds"),
    path.resolve("/tmp/studios-styleseat"),
    path.resolve("/tmp/studios-prospects"),
  ];

  if (resolved === allowedLocal || resolved.startsWith(`${allowedLocal}${path.sep}`)) return;
  if (allowedTmpPrefixes.some((prefix) => resolved === prefix || resolved.startsWith(`${prefix}${path.sep}`))) return;

  throw new Error(`Refusing to touch unsafe runtime path: ${resolved}`);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function countRuntimeEntries(root: string): Promise<number> {
  if (!(await pathExists(root))) return 0;
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.name !== ".gitkeep").length;
}

async function readJsonProspectCount(filePath: string): Promise<number> {
  if (!(await pathExists(filePath))) return 0;
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8"));
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function postgresTableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function postgresCount(tableName: string): Promise<number> {
  const table = Prisma.raw(`"${tableName.replace(/"/g, "\"\"")}"`);
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
    SELECT COUNT(*) AS count FROM ${table}
  `;
  return Number(rows[0]?.count ?? 0);
}

async function resolveBackend(requested: Backend): Promise<"postgres" | "json"> {
  if (requested === "postgres") return "postgres";
  if (requested === "json") return "json";
  if (process.env.DATABASE_URL && await postgresTableExists("studio_prospects")) return "postgres";
  return "json";
}

async function buildPlan(options: Options, backend: "postgres" | "json"): Promise<DeletePlanItem[]> {
  const plan: DeletePlanItem[] = [];

  if (backend === "postgres") {
    const prospectsExists = await postgresTableExists("studio_prospects");
    plan.push({
      label: "canonical prospects",
      type: "postgres_table",
      target: "studio_prospects",
      count: prospectsExists ? await postgresCount("studio_prospects") : 0,
      action: "delete all rows",
      exists: prospectsExists,
    });

    if (options.includeRuns) {
      for (const table of [
        "studio_hashtag_harvest_runs",
        "studio_education_directory_runs",
        "studio_education_seed_runs",
        "studio_styleseat_runs",
      ]) {
        const exists = await postgresTableExists(table);
        plan.push({
          label: `${table} run history`,
          type: "postgres_table",
          target: table,
          count: exists ? await postgresCount(table) : 0,
          action: exists ? "delete all rows" : "skip; table not found",
          exists,
        });
      }
    }
  }

  if (backend === "json" || options.includeRuntime) {
    const prospectsFile = prospectJsonPath();
    plan.push({
      label: "JSON prospect store",
      type: "json_file",
      target: prospectsFile,
      count: await readJsonProspectCount(prospectsFile),
      action: "write []",
      exists: await pathExists(prospectsFile),
    });
  }

  if (options.includeRuntime) {
    for (const root of runtimeRoots()) {
      plan.push({
        label: root.label,
        type: "runtime_dir",
        target: root.path,
        count: await countRuntimeEntries(root.path),
        action: "remove directory contents except .gitkeep",
        exists: await pathExists(root.path),
      });
    }
  }

  return plan;
}

async function clearRuntimeDir(root: string): Promise<void> {
  assertSafeRuntimeTarget(root);
  if (!(await pathExists(root))) return;
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".gitkeep") continue;
    await fs.rm(path.join(root, entry.name), { recursive: true, force: true });
  }
}

async function executePlan(plan: DeletePlanItem[]): Promise<void> {
  for (const item of plan) {
    if (!item.exists) continue;
    if (item.type === "postgres_table") {
      if (item.target !== "studio_prospects" && !item.target.endsWith("_runs")) continue;
      const table = Prisma.raw(`"${item.target.replace(/"/g, "\"\"")}"`);
      await prisma.$executeRaw`DELETE FROM ${table}`;
    } else if (item.type === "json_file") {
      assertSafeRuntimeTarget(item.target);
      await fs.mkdir(path.dirname(item.target), { recursive: true });
      await fs.writeFile(item.target, "[]\n", "utf-8");
    } else if (item.type === "runtime_dir") {
      await clearRuntimeDir(item.target);
    }
  }
}

async function main() {
  const options = parseArgs();
  const production = isProductionRuntime();
  const backend = await resolveBackend(options.backend);
  const plan = await buildPlan(options, backend);

  const report = {
    dryRun: options.dryRun,
    backend,
    requestedBackend: options.backend,
    includeRuns: options.includeRuns,
    includeRuntime: options.includeRuntime,
    productionRuntime: production,
    warnings: [
      production ? "Production runtime detected. --confirm-production-reset is required for live deletion." : null,
      production && options.includeRuntime ? "Runtime files in production are ephemeral /tmp artifacts." : null,
    ].filter(Boolean),
    plan,
  };

  console.log(JSON.stringify(report, null, 2));

  if (options.dryRun) return;
  if (!options.confirm) throw new Error("Live reset requires --confirm");
  if (production && !options.confirmProductionReset) {
    throw new Error("Production reset requires --confirm-production-reset");
  }
  if (production && options.includeRuntime && !options.includeRuns) {
    throw new Error("Production runtime deletion requires --include-runs explicitly");
  }

  await executePlan(plan);
  const afterPlan = await buildPlan(options, backend);
  console.log(JSON.stringify({ ok: true, after: afterPlan }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
