import path from "path";

/** tAIkOS session persistence — mirrors VMB runtime layout. */
export function getTaikosDataDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "taikos")
    : path.join(process.cwd(), "runtime-data", "taikos");
}

export function getTaikosSessionsFile(): string {
  return path.join(getTaikosDataDir(), "sessions.json");
}
