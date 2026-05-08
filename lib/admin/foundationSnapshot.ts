import packageJson from "../../package.json";
import { getDatabaseHostHint } from "@/lib/db/databaseHostHint";

export type RuntimeFoundationSnapshot = {
  appVersion: string;
  nextVersion: string;
  nodeVersion: string;
  vercelEnv: string | null;
  vercelGitCommitSha: string | null;
  vercelGitCommitRef: string | null;
  vercelUrl: string | null;
  databaseHost: string;
  checkedAt: string;
};

export function getRuntimeFoundationSnapshot(): RuntimeFoundationSnapshot {
  const nextRaw = packageJson.dependencies?.next;
  const nextVersion =
    typeof nextRaw === "string" ? nextRaw.replace(/^[\^~]/, "") : "—";

  return {
    appVersion: packageJson.version,
    nextVersion,
    nodeVersion: process.version,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    databaseHost: getDatabaseHostHint(),
    checkedAt: new Date().toISOString(),
  };
}
