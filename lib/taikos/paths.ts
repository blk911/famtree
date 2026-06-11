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

export function getTaikosActionLogFile(): string {
  return path.join(getTaikosDataDir(), "action-log.json");
}

export function getTaikosDraftsFile(): string {
  return path.join(getTaikosDataDir(), "drafts.json");
}

export function getTaikosGoalsFile(): string {
  return path.join(getTaikosDataDir(), "goals.json");
}

export function getTaikosExecutionQueueFile(): string {
  return path.join(getTaikosDataDir(), "execution-queue.json");
}

export function getTaikosActivityStreamFile(): string {
  return path.join(getTaikosDataDir(), "activity-stream.json");
}
