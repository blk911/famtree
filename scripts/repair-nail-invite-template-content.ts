/**
 * npm run repair:nail-invite-templates
 */
import {
  printRepairSummary,
  repairNailInviteTemplateContent,
} from "../lib/vmb/invite-templates/repair-nail-invite-template-content";
import { validateNailInviteTemplateDiagnostics } from "../lib/vmb/invite-templates/invite-template-diagnostics";

async function run(): Promise<void> {
  const result = await repairNailInviteTemplateContent();
  printRepairSummary(result);

  if (result.errors.length) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  const validationErrors = validateNailInviteTemplateDiagnostics(result.after);
  if (validationErrors.length) {
    for (const error of validationErrors) {
      console.error(`FAIL: ${error}`);
    }
    process.exit(1);
  }

  console.log("OK: nail invite template store repaired");
}

void run();
