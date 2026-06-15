/**
 * npm run test:vmb:invite-events
 */
import fs from "node:fs";
import path from "node:path";
import { appendInviteEvent } from "../lib/vmb/invites/append-invite-event";
import {
  INVITE_EVENT_DUPLICATE_ID,
  appendInviteEventRecord,
  getInviteEventById,
  listInviteEventsForSalon,
} from "../lib/vmb/invites/invite-event-store";
import {
  INVITE_EVENT_TYPES,
  isVmbInviteEvent,
  inviteEventTypesForAdminPanel,
} from "../lib/vmb/invites/invite-event-types";
import { getVmbInviteEventsFile } from "../lib/vmb/paths";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function withIsolatedEventsFile<T>(run: () => Promise<T>): Promise<T> {
  const filePath = getVmbInviteEventsFile();
  const backupPath = `${filePath}.test-backup`;
  const hadBackup = fs.existsSync(backupPath);
  const hadFile = fs.existsSync(filePath);
  const original = hadFile ? fs.readFileSync(filePath, "utf8") : null;

  fs.writeFileSync(filePath, "[]", "utf8");
  try {
    return await run();
  } finally {
    if (original === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, original, "utf8");
    }
    if (hadBackup) {
      fs.writeFileSync(backupPath, fs.readFileSync(backupPath, "utf8"), "utf8");
    }
  }
}

async function run(): Promise<void> {
  assert(INVITE_EVENT_TYPES.length === 8, "eight invite event types defined");
  for (const eventType of INVITE_EVENT_TYPES) {
    assert(typeof eventType === "string" && eventType.length > 0, `event type defined: ${eventType}`);
  }

  assert(
    inviteEventTypesForAdminPanel("claims").join(",") === "invite_claimed",
    "claims panel maps invite_claimed",
  );
  assert(
    inviteEventTypesForAdminPanel("opens").join(",") === "invite_opened",
    "opens panel maps invite_opened",
  );
  assert(
    inviteEventTypesForAdminPanel("conversions").join(",") ===
      "invite_converted,booking_started,booking_completed",
    "conversions panel maps funnel events",
  );

  const adminPanelPaths = [
    "components/admin/workspaces/InvitesEventsAdminPanel.tsx",
    "app/(app)/admin/(platform)/invites/claims/page.tsx",
    "app/(app)/admin/(platform)/invites/opens/page.tsx",
    "app/(app)/admin/(platform)/invites/conversions/page.tsx",
  ];
  for (const relativePath of adminPanelPaths) {
    assert(fs.existsSync(path.join(process.cwd(), relativePath)), `admin panel file exists: ${relativePath}`);
  }

  for (const relativePath of adminPanelPaths.slice(1)) {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    assert(source.includes("InvitesEventsAdminPanel"), `${relativePath} uses event admin panel`);
    assert(source.includes("emptyMessage"), `${relativePath} defines empty state copy`);
  }

  await withIsolatedEventsFile(async () => {
    const salonId = `evt-test-${Date.now()}`;
    const eventId = `evt-fixed-${Date.now()}`;

    const created = await appendInviteEvent({
      eventId,
      eventType: "invite_created",
      salonId,
      operatorId: "operator-1",
      payload: {
        draftId: "draft-1",
        clientName: "Alex",
        inviteCategory: "private_client_network",
      },
    });
    assert(created.ok, "appendInviteEvent succeeds");
    if (!created.ok) return;
    assert(isVmbInviteEvent(created.event), "appended event passes schema validation");
    assert(created.event.eventId === eventId, "preserves supplied event id");

    const loaded = await getInviteEventById(eventId);
    assert(Boolean(loaded), "event readable by id");
    assert(loaded?.eventType === "invite_created", "stored event type matches");

    const listed = await listInviteEventsForSalon(salonId, { types: ["invite_created"] });
    assert(listed.length === 1, "listInviteEventsForSalon returns appended event");
    assert(listed[0]?.payload.clientName === "Alex", "payload round-trips");

    const duplicate = await appendInviteEventRecord(created.event);
    assert("error" in duplicate, "duplicate append rejected");
    if ("error" in duplicate) {
      assert(duplicate.error === INVITE_EVENT_DUPLICATE_ID, "duplicate error code");
    }

    const queued = await appendInviteEvent({
      eventType: "invite_queued",
      salonId,
      payload: { draftId: "draft-1", queueId: "queue-1" },
    });
    assert(queued.ok, "second event appends");
    if (!queued.ok) return;
    assert(queued.event.eventId !== eventId, "auto-generates unique event ids");

    const allForSalon = await listInviteEventsForSalon(salonId);
    assert(allForSalon.length === 2, "append/read stores multiple events");
    assert(
      new Set(allForSalon.map((event) => event.eventId)).size === allForSalon.length,
      "no duplicate event ids in store",
    );
  });

  console.log("OK: vmb invite event tests passed");
}

void run();
