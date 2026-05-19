/**
 * Legacy private Post → Msg Vault migration (dry-run by default).
 *
 * Usage:
 *   npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts           # dry-run (default)
 *   npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts --dry-run
 *   npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts --apply     # writes to DB
 *   npx tsx scripts/msg-vault/migrate-legacy-private-posts.ts --json      # machine-readable summary
 *
 * Safety:
 *   - Never deletes legacy posts
 *   - Idempotent via directKey / trustUnitId / LEGACY_POST_IMPORTED governance events
 *   - Do NOT run --apply against production without explicit approval
 *
 * @see docs/msg-vault/legacy-private-migration-runbook.md
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import {
  applyMigrationPlan,
  buildMigrationPlan,
  type MigrationPlan,
} from "@/lib/msg-vault/migration/legacy-private-posts";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY_RUN = args.includes("--dry-run") || !APPLY;
const JSON_OUT = args.includes("--json");
const ALLOW_PROD = args.includes("--allow-production");

function isLikelyProductionDb(url: string | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes("localhost") || u.includes("127.0.0.1")) return false;
  if (u.includes("famtree.test") || u.includes("_test")) return false;
  return u.includes("neon.tech") || u.includes("vercel") || u.includes("prod");
}

function summarizeByReason(
  skipped: MigrationPlan["skipped"],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of skipped) {
    out[s.reason] = (out[s.reason] ?? 0) + 1;
  }
  return out;
}

function printHumanReport(plan: MigrationPlan) {
  console.log("\nMsg Vault — Legacy Private Post Migration");
  console.log("═".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "APPLY (mutating)"}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@") ?? "(unset)"}`);
  console.log("─".repeat(60));

  console.log("\n## Counts");
  console.log(`  Legacy posts scanned (eligible query):  ${plan.eligiblePostCount}`);
  console.log(`  Inferred conversations (thread groups): ${plan.inferredConversationCount}`);
  console.log(`  Distinct participants (union):          ${plan.inferredParticipantCount}`);
  console.log(`  Messages to create:                     ${plan.messagesToCreate}`);
  console.log(`  Messages already migrated (skipped):    ${plan.messagesAlreadyMigrated}`);
  console.log(`  Skipped post records:                   ${plan.skipped.length}`);

  const skipByReason = summarizeByReason(plan.skipped);
  if (Object.keys(skipByReason).length > 0) {
    console.log("\n## Skipped records (by reason)");
    for (const [reason, count] of Object.entries(skipByReason).sort()) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  if (plan.missingUserIds.length > 0) {
    console.log("\n## Missing users");
    for (const id of plan.missingUserIds.slice(0, 20)) {
      console.log(`  • ${id}`);
    }
    if (plan.missingUserIds.length > 20) {
      console.log(`  … and ${plan.missingUserIds.length - 20} more`);
    }
  }

  if (plan.duplicateRisks.length > 0) {
    console.log("\n## Duplicate / merge risks");
    const byKind: Record<string, number> = {};
    for (const r of plan.duplicateRisks) {
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    }
    for (const [kind, count] of Object.entries(byKind).sort()) {
      console.log(`  ${kind}: ${count}`);
    }
    console.log("  (Existing vault rows will receive new messages; no duplicate conversations for DIRECT/TU keys.)");
    for (const r of plan.duplicateRisks.slice(0, 8)) {
      console.log(`    - [${r.kind}] ${r.legacyThreadKey}: ${r.detail}`);
    }
    if (plan.duplicateRisks.length > 8) {
      console.log(`    … and ${plan.duplicateRisks.length - 8} more`);
    }
  }

  console.log("\n## Sample threads (up to 10)");
  for (const t of plan.threads.slice(0, 10)) {
    const exist = t.existingConversationId ? `reuse ${t.existingConversationId}` : "create new";
    console.log(
      `  • ${t.kind} key=${t.legacyThreadKey.slice(0, 40)}${t.legacyThreadKey.length > 40 ? "…" : ""} posts=${t.posts.length} msgs+${t.messagesToCreate} (${exist})`,
    );
  }
  if (plan.threads.length > 10) {
    console.log(`  … and ${plan.threads.length - 10} more threads`);
  }

  console.log("\n## Idempotency");
  console.log("  • DIRECT: unique directKey on AihMsgConversation");
  console.log("  • TU THREAD: trustUnitId + kind THREAD");
  console.log("  • GROUP: policySnapshot.migration.legacyThreadKey");
  console.log("  • MESSAGE: AihMsgGovernanceEvent LEGACY_POST_IMPORTED + contextJson.legacyPostId");
  console.log("  • Legacy Post rows are never deleted");

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete. Re-run with --apply to write (after approval).");
  }
}

async function main() {
  if (APPLY && isLikelyProductionDb(process.env.DATABASE_URL) && !ALLOW_PROD) {
    console.error(
      "\n❌ Refusing --apply: DATABASE_URL looks like production.\n" +
        "   Pass --allow-production only after explicit human approval.\n",
    );
    process.exit(1);
  }

  const plan = await buildMigrationPlan();

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          mode: DRY_RUN ? "dry-run" : "apply",
          plan: {
            eligiblePostCount: plan.eligiblePostCount,
            inferredConversationCount: plan.inferredConversationCount,
            inferredParticipantCount: plan.inferredParticipantCount,
            messagesToCreate: plan.messagesToCreate,
            messagesAlreadyMigrated: plan.messagesAlreadyMigrated,
            skippedCount: plan.skipped.length,
            skippedByReason: summarizeByReason(plan.skipped),
            duplicateRiskCount: plan.duplicateRisks.length,
            missingUserIds: plan.missingUserIds,
          },
        },
        null,
        2,
      ),
    );
  } else {
    printHumanReport(plan);
  }

  if (!APPLY) {
    return;
  }

  if (!JSON_OUT) {
    console.log("\n── Applying migration ──");
  }

  const applyResult = await applyMigrationPlan(plan);

  if (JSON_OUT) {
    console.log(JSON.stringify({ apply: applyResult }, null, 2));
  } else {
    console.log(`  Conversations created:  ${applyResult.conversationsCreated}`);
    console.log(`  Conversations reused:   ${applyResult.conversationsReused}`);
    console.log(`  Participants created:   ${applyResult.participantsCreated}`);
    console.log(`  Messages created:       ${applyResult.messagesCreated}`);
    console.log(`  Governance events:      ${applyResult.governanceEventsCreated}`);
    if (applyResult.errors.length > 0) {
      console.log(`  Errors:                 ${applyResult.errors.length}`);
      for (const e of applyResult.errors) {
        console.log(`    • ${e.legacyThreadKey}: ${e.message}`);
      }
    }
  }

  if (applyResult.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
