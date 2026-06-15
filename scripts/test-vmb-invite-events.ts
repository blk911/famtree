/**
 * npm run test:vmb:invite-events
 */
import fs from "node:fs";
import path from "node:path";
import type { TaikosDraft } from "../lib/taikos/drafts/types";
import { getTaikosDraftsFile } from "../lib/taikos/paths";
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
import { assertNoAdminFieldsInRecipientPayload } from "../lib/vmb/invites/recipient-invite-view";
import { recordInviteOpened } from "../lib/vmb/invites/record-invite-opened";
import { buildRecipientInvitePath } from "../lib/vmb/invites/recipient-invite-url";
import { resolveRecipientInvite } from "../lib/vmb/invites/resolve-recipient-invite";
import { getVmbInviteEventsFile, getVmbTrialsFile } from "../lib/vmb/paths";
import type { VmbTrialLead } from "../types/vmb/trial";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

async function withIsolatedJsonFile<T>(filePath: string, run: () => Promise<T>): Promise<T> {
  const hadFile = fs.existsSync(filePath);
  const original = hadFile ? fs.readFileSync(filePath, "utf8") : null;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "[]", "utf8");
  try {
    return await run();
  } finally {
    if (original === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, original, "utf8");
    }
  }
}

async function withIsolatedEventsFile<T>(run: () => Promise<T>): Promise<T> {
  return withIsolatedJsonFile(getVmbInviteEventsFile(), run);
}

function buildTestTaikosDraft(overrides: Partial<TaikosDraft> & Pick<TaikosDraft, "draftId" | "salonId">): TaikosDraft {
  const now = new Date().toISOString();
  return {
    operatorId: "operator-test",
    createdAt: now,
    updatedAt: now,
    sourcePage: "/vmb/today",
    draftType: "pcn_invite",
    title: "Grace — Private Client Invite",
    status: "approved",
    payload: {
      inviteCard: {
        cardType: "pcn_invite",
        recipientName: "Grace",
        actionLabel: "Private Client Invite",
        greeting: "Dear Grace,",
        personalConnection: "You make every visit feel calm.",
        inviteMessage: "I wanted to invite you into my Private Client Network.",
        offerMessage: "",
        signature: "Jenny",
        primaryCta: "Join My Private Client Network",
      },
    },
    estimatedValue: 0,
    audit: {},
    ...overrides,
  };
}

async function testRecipientInviteLanding(): Promise<void> {
  assert(
    fs.existsSync(path.join(process.cwd(), "app/vmb/invite/[inviteId]/page.tsx")),
    "recipient landing route page exists",
  );

  const salonId = `recipient-salon-${Date.now()}`;
  const draftId = `td-recipient-${Date.now()}`;
  const trialLead: VmbTrialLead = {
    id: salonId,
    salonName: "Blue Mountain Salon",
    ownerName: "Jenny",
    email: "jenny@salon.test",
    createdAt: new Date().toISOString(),
  };

  await withIsolatedJsonFile(getVmbTrialsFile(), async () => {
    fs.writeFileSync(getVmbTrialsFile(), JSON.stringify([trialLead], null, 2), "utf8");

    await withIsolatedJsonFile(getTaikosDraftsFile(), async () => {
      const draft = buildTestTaikosDraft({ draftId, salonId, status: "approved" });
      fs.writeFileSync(getTaikosDraftsFile(), JSON.stringify([draft], null, 2), "utf8");

      const resolved = await resolveRecipientInvite(draftId);
      assert(resolved.status === "available", "valid invite resolves to available");
      if (resolved.status !== "available") return;
      assert(resolved.view.previewModel.metadata.recipientName === "Grace", "renders recipient card");
      assert(resolved.view.salonDisplayName === "Blue Mountain Salon", "shows salon display name only");
      assertNoAdminFieldsInRecipientPayload(resolved.view);

      const expiredDraft = buildTestTaikosDraft({ draftId: `${draftId}-expired`, salonId, status: "archived" });
      fs.writeFileSync(getTaikosDraftsFile(), JSON.stringify([draft, expiredDraft], null, 2), "utf8");
      const expired = await resolveRecipientInvite(`${draftId}-expired`);
      assert(expired.status === "expired", "archived invite returns expired state");

      const missing = await resolveRecipientInvite("missing-invite-id");
      assert(missing.status === "not_found", "unknown invite returns not_found");
    });
  });

  await withIsolatedEventsFile(async () => {
    await recordInviteOpened({
      salonId,
      inviteId: draftId,
      draftId,
      clientName: "Grace",
      sourcePage: buildRecipientInvitePath(draftId),
    });
    const opens = await listInviteEventsForSalon(salonId, { types: ["invite_opened"] });
    assert(opens.length === 1, "invite_opened event writes on landing view");
    assert(opens[0]?.payload.inviteId === draftId, "invite_opened includes inviteId");
    assert(opens[0]?.payload.sourcePage === buildRecipientInvitePath(draftId), "invite_opened includes source route");
  });
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

  await testRecipientInviteLanding();

  console.log("OK: vmb invite event tests passed");
}

void run();
