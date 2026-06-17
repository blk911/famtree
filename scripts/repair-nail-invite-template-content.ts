/**
 * npm run repair:nail-invite-templates
 */
import { repairNailInviteTemplateContent } from "../lib/vmb/invite-templates/repair-nail-invite-template-content";

async function run(): Promise<void> {
  const result = await repairNailInviteTemplateContent();
  console.log(`Repaired ${result.repaired} nail invite templates.`);
  if (result.errors.length) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }
}

void run();
