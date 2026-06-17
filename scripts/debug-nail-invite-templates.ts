/**
 * npm run debug:nail-invite-templates
 */
import {
  loadNailInviteTemplateDiagnostics,
  printNailInviteTemplateDiagnostics,
  validateNailInviteTemplateDiagnostics,
} from "../lib/vmb/invite-templates/invite-template-diagnostics";

async function run(): Promise<void> {
  const summary = await loadNailInviteTemplateDiagnostics();
  printNailInviteTemplateDiagnostics(summary);

  const errors = validateNailInviteTemplateDiagnostics(summary);
  if (errors.length) {
    for (const error of errors) {
      console.error(`FAIL: ${error}`);
    }
    process.exit(1);
  }

  console.log("OK: nail invite template store diagnostics passed");
}

void run();
