// scripts/build-transpo-research-queue.ts

import {
  buildResearchQueue,
  mergeResearchTasksWithState,
} from "@/lib/transpo/build-research-queue";
import { readResearchTaskState } from "@/lib/transpo/read-research-queue";

async function main(): Promise<void> {
  const { queue, summary } = await buildResearchQueue();
  const state = await readResearchTaskState();
  const merged = mergeResearchTasksWithState(queue.tasks, state);

  const critical = merged.filter((t) => t.priority === "critical").length;
  const high = merged.filter((t) => t.priority === "high").length;

  const topCounties = [...summary.counties]
    .sort((a, b) => b.openTasks - a.openTasks)
    .slice(0, 10);

  console.log("Transpo research queue build complete");
  console.log(`Counties: ${summary.totalCounties}`);
  console.log(`Tasks: ${queue.totalTasks}`);
  console.log(`Critical: ${critical}`);
  console.log(`High: ${high}`);
  console.log("");
  console.log("Top 10 counties by open research:");
  for (const c of topCounties) {
    console.log(`  ${c.county} (${c.state}): ${c.openTasks} open, ${c.criticalTasks} critical`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
