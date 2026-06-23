/**
 * npm run seed:vmb:demo
 */
import { ensureVmbDemoSalon } from "../lib/vmb/vmb-demo-salon";

async function run(): Promise<void> {
  const demo = await ensureVmbDemoSalon();
  if (!demo.ok) {
    console.error(`FAIL: ${demo.error}`);
    process.exit(1);
  }
  console.log("OK: VMB demo salon ready");
  console.log(`  salon: ${demo.trialId}`);
  console.log(`  today: ${demo.redirectTo}`);
  console.log(`  clients: ${demo.clientCount}`);
  console.log(`  services active: ${demo.serviceCount}`);
  console.log(`  invite types approved: ${demo.inviteTypeCount}`);
  if (demo.seedPath) console.log(`  seed: ${demo.seedPath}`);
}

void run();
