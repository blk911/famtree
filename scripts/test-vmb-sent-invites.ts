import fs from "node:fs";
import path from "node:path";
import { approveSalonInvitation, pauseSalonInvitationApproval } from "../lib/vmb/invites/salon-invitation-approval-store";
import { sendApprovedInvitation } from "../lib/vmb/invites/create-sent-invite";
import { resolveRecipientInvite } from "../lib/vmb/invites/resolve-recipient-invite";
import { claimSentInvite, createSentInvite, listSalonClaimTimeline, markSentInviteOpened, redeemSentInvite, resetSentInviteMemoryStoreForTests } from "../lib/vmb/invites/sent-invite-store";
import { assertNoAdminFieldsInRecipientPayload } from "../lib/vmb/invites/recipient-invite-view";
import { hashInviteClaimContact, maskRecipientContactSummary, normalizeRecipientContact } from "../lib/vmb/invites/recipient-contact";
import { listSalonInviteLocalCopies, updateSalonInviteLocalCopy } from "../lib/vmb/invites/salon-invite-local-copy-store";
import { getVmbSalonInvitationApprovalsFile, getVmbSalonInviteCopiesFile, getVmbSalonOfferCatalogFile, getVmbSalonServiceConfigsFile } from "../lib/vmb/paths";
import type { InviteTemplateSnapshot } from "../lib/vmb/invites/invite-template-snapshot";
import { createSalonOfferCatalogEntry, updateSalonOfferCatalogEntry } from "../lib/vmb/salon-offers/salon-offer-catalog-store";
import { upsertSalonServiceConfig } from "../lib/vmb/services/salon-service-config-store";
import { createVmbSalonSession } from "../lib/vmb/salon-authority";
import { VMB_TRIAL_COOKIE } from "../lib/vmb/paths";
import { NextRequest } from "next/server";
import { GET as getSentInvites, POST as postSentInvite } from "../app/api/vmb/sent-invites/route";
import { POST as postRedeem } from "../app/api/vmb/sent-invites/[sentInviteId]/redeem/route";

delete process.env.DATABASE_URL;
delete process.env.VERCEL;
process.env.VMB_MONEY_TEST_MEMORY = "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function isolated(run: () => Promise<void>) {
  const files = [getVmbSalonInvitationApprovalsFile(), getVmbSalonInviteCopiesFile(), getVmbSalonOfferCatalogFile(), getVmbSalonServiceConfigsFile()];
  const originals = new Map(files.map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null]));
  for (const file of files) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "[]", "utf8"); }
  resetSentInviteMemoryStoreForTests();
  try { await run(); } finally {
    for (const [file, original] of originals) original === null ? fs.rmSync(file, { force: true }) : fs.writeFileSync(file, original, "utf8");
  }
}

function snapshot(salonName: string, serviceIds: string[] = []): InviteTemplateSnapshot {
  const now = new Date().toISOString();
  return { id: "snapshot-1", sourceTemplateId: "template-1", templateName: "Birthday Offer", categoryId: "nails", headline: "A birthday treat", body: "Your private birthday offer is ready.", ctaLabel: "Claim offer", serviceIds, rewardIds: [], priceLabel: "$75", termsText: "One per client", ownerName: "Avery", salonName, status: "published", version: 1, createdAt: now, updatedAt: now };
}

async function seed(salonId: string, status: "approved" | "paused" = "approved", options: { serviceIds?: string[]; salonOfferCatalogId?: string } = {}) {
  const snap = snapshot("Canonical Salon", options.serviceIds);
  const copyId = `${salonId}-copy-1`;
  const now = new Date().toISOString();
  fs.writeFileSync(getVmbSalonInviteCopiesFile(), JSON.stringify([{ salonId, copy: { id: copyId, salonId, sourceTemplateId: snap.sourceTemplateId, publishedVersion: 1, inventoryStatus: "published", snapshot: snap, createdAt: now, updatedAt: now } }]), "utf8");
  const input = { clientName: "Jordan", opportunityType: "birthday", sourceCopyId: copyId, sourceTemplateId: snap.sourceTemplateId, snapshot: snap, reasonText: "Birthday this month", status, salonOfferCatalogId: options.salonOfferCatalogId } as const;
  const result = status === "approved" ? await approveSalonInvitation(salonId, input) : await pauseSalonInvitationApproval(salonId, input);
  assert(!("error" in result), "approval fixture created");
  return { approval: result.approval, copyId };
}

async function run() {
  await isolated(async () => {
    const salonId = `salon-${Date.now()}`;
    await upsertSalonServiceConfig(salonId, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(salonId, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    const offer = await createSalonOfferCatalogEntry(salonId, { name: "Birthday Gel-X", description: "Private birthday set", serviceId: "default-nails-gel-x", addonIds: [], active: true });
    assert(!("error" in offer), "active linked offer fixture created");
    const { approval, copyId } = await seed(salonId, "approved", { serviceIds: ["default-nails-gel-x"], salonOfferCatalogId: offer.entry.id });
    assert((await listSalonInviteLocalCopies(salonId)).length === 1, "active touchpoint fixture loads");
    const sent = await sendApprovedInvitation({ salonId, approvalId: approval.id });
    assert(!("error" in sent), `active approved offer sends${"error" in sent ? `: ${sent.error}` : ""}`);
    assert(sent.sentInvite.status === "sent", "new aggregate begins sent");

    const opened = await resolveRecipientInvite(sent.recipientToken);
    assert(opened.status === "available", "sent invite opens by token");
    if (opened.status === "available") assertNoAdminFieldsInRecipientPayload(opened.view);
    assert((await resolveRecipientInvite(approval.id)).status === "not_found", "draft or approval id cannot open public invite");

    await updateSalonInviteLocalCopy(salonId, copyId, { headline: "MUTATED AFTER SEND" });
    const afterEdit = await resolveRecipientInvite(sent.recipientToken);
    assert(afterEdit.status === "available" && afterEdit.view.previewModel.title === "A birthday treat", "sent snapshot is immutable after salon edit");

    const contact = normalizeRecipientContact("jordan@example.com");
    assert(contact, "claim contact normalizes");
    const claimInput = { token: sent.recipientToken, clientName: "Jordan", recipientContactSummary: maskRecipientContactSummary(contact), recipientContactHash: hashInviteClaimContact(sent.sentInvite.id, contact) };
    const [first, second] = await Promise.all([claimSentInvite(claimInput), claimSentInvite(claimInput)]);
    assert(first.ok && second.ok, "concurrent double claim succeeds idempotently");
    assert(first.existing !== second.existing, "exactly one claim is newly created");
    const sameContact = await claimSentInvite(claimInput);
    assert(sameContact.ok && sameContact.existing, "same normalized contact is idempotent");
    const otherContact = await claimSentInvite({ ...claimInput, recipientContactHash: "different-contact-hash" });
    assert(!otherContact.ok && otherContact.status === 409 && otherContact.error === "already_claimed_by_other", "different contact receives already_claimed_by_other");
    const timeline = await listSalonClaimTimeline(salonId);
    assert(timeline.length === 1 && timeline[0]?.claim, "salon dashboard sees claim");

    const redeemed = await redeemSentInvite(salonId, sent.sentInvite.id);
    assert(!("error" in redeemed) && redeemed.sentInvite.status === "redeemed", "salon can redeem claim");
    const afterRedeem = await claimSentInvite(claimInput);
    assert(!afterRedeem.ok && afterRedeem.status === 409, "redeemed invite cannot be claimed again");
    const redeemedView = await resolveRecipientInvite(sent.recipientToken);
    assert(redeemedView.status === "expired", "redeemed token resolves unavailable");

    const paused = await seed(`${salonId}-paused`, "paused");
    const pausedSend = await sendApprovedInvitation({ salonId: `${salonId}-paused`, approvalId: paused.approval.id });
    assert("error" in pausedSend, "draft or paused approval cannot send");

    const activePaused = await seed(`${salonId}-touchpoint-paused`);
    await updateSalonInviteLocalCopy(`${salonId}-touchpoint-paused`, activePaused.copyId, { inventoryStatus: "paused" });
    assert("error" in await sendApprovedInvitation({ salonId: `${salonId}-touchpoint-paused`, approvalId: activePaused.approval.id }), "paused touchpoint cannot send");
    const activeExpired = await seed(`${salonId}-expired-send`);
    assert("error" in await sendApprovedInvitation({ salonId: `${salonId}-expired-send`, approvalId: activeExpired.approval.id, expiresAt: new Date(Date.now() - 1000).toISOString() }), "expired invitation cannot send");

    const expired = await createSentInvite({ salonId, sourceApprovalId: "expired-source", sourceCopyId: copyId, snapshot: sent.sentInvite.snapshot, expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert(!("error" in expired), "expired fixture created");
    const expiredClaim = await claimSentInvite({ ...claimInput, token: expired.recipientToken, recipientContactHash: "expired-hash" });
    assert(!expiredClaim.ok && expiredClaim.status === 410, "expired token cannot claim");

    const deletedOfferApproval = await seed(`${salonId}-deleted-offer`, "approved", { salonOfferCatalogId: "missing-offer" });
    assert("error" in await sendApprovedInvitation({ salonId: `${salonId}-deleted-offer`, approvalId: deletedOfferApproval.approval.id }), "deleted offer cannot send");
    const foreignOfferSalon = `${salonId}-foreign-offer-owner`;
    await upsertSalonServiceConfig(foreignOfferSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(foreignOfferSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    const foreignOffer = await createSalonOfferCatalogEntry(foreignOfferSalon, { name: "Foreign", description: "Other salon", serviceId: "default-nails-gel-x", addonIds: [] });
    assert(!("error" in foreignOffer), "foreign offer fixture created");
    const crossOfferSalon = `${salonId}-cross-offer`;
    await upsertSalonServiceConfig(crossOfferSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(crossOfferSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    const crossOfferApproval = await seed(crossOfferSalon, "approved", { serviceIds: ["default-nails-gel-x"], salonOfferCatalogId: foreignOffer.entry.id });
    assert("error" in await sendApprovedInvitation({ salonId: crossOfferSalon, approvalId: crossOfferApproval.approval.id }), "cross-salon offer cannot send");
    const inactiveSalon = `${salonId}-inactive-offer`;
    await upsertSalonServiceConfig(inactiveSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(inactiveSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    const inactiveOffer = await createSalonOfferCatalogEntry(inactiveSalon, { name: "Inactive", description: "Inactive", serviceId: "default-nails-gel-x", addonIds: [] });
    assert(!("error" in inactiveOffer), "inactive offer fixture created");
    await updateSalonOfferCatalogEntry(inactiveSalon, inactiveOffer.entry.id, { active: false });
    const inactiveApproval = await seed(inactiveSalon, "approved", { serviceIds: ["default-nails-gel-x"], salonOfferCatalogId: inactiveOffer.entry.id });
    assert("error" in await sendApprovedInvitation({ salonId: inactiveSalon, approvalId: inactiveApproval.approval.id }), "inactive offer cannot send");
    const missingService = await seed(`${salonId}-missing-service`, "approved", { serviceIds: ["default-nails-gel-x"] });
    await upsertSalonServiceConfig(`${salonId}-foreign-service-owner`, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(`${salonId}-foreign-service-owner`, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    assert("error" in await sendApprovedInvitation({ salonId: `${salonId}-missing-service`, approvalId: missingService.approval.id }), "deleted, inactive, or cross-salon service cannot send");

    const unsignedRequest = new NextRequest("http://localhost/api/vmb/sent-invites", { headers: { cookie: `${VMB_TRIAL_COOKIE}=${salonId}` } });
    assert((await getSentInvites(unsignedRequest)).status === 401, "unsigned salon cookie cannot view timeline");
    const otherSalon = `${salonId}-other`;
    const otherCookie = `${VMB_TRIAL_COOKIE}=${createVmbSalonSession(otherSalon)}`;
    const spoofSend = new NextRequest("http://localhost/api/vmb/sent-invites", { method: "POST", headers: { cookie: otherCookie, "content-type": "application/json" }, body: JSON.stringify({ approvalId: approval.id }) });
    assert((await postSentInvite(spoofSend)).status === 404, "signed different salon cannot send another salon approval");
    const spoofTimeline = await getSentInvites(new NextRequest("http://localhost/api/vmb/sent-invites", { headers: { cookie: otherCookie } }));
    const spoofTimelineJson = await spoofTimeline.json() as { timeline?: unknown[] };
    assert(spoofTimelineJson.timeline?.length === 0, "signed different salon cannot view another salon timeline");
    const spoofRedeem = await postRedeem(new NextRequest(`http://localhost/api/vmb/sent-invites/${sent.sentInvite.id}/redeem`, { method: "POST", headers: { cookie: otherCookie } }), { params: Promise.resolve({ sentInviteId: sent.sentInvite.id }) });
    assert(spoofRedeem.status === 404, "signed different salon cannot redeem another salon invite");

    const validCookie = `${VMB_TRIAL_COOKIE}=${createVmbSalonSession(salonId)}`;
    const timelineResponse = await getSentInvites(new NextRequest("http://localhost/api/vmb/sent-invites", { headers: { cookie: validCookie } }));
    const timelineText = await timelineResponse.text();
    for (const forbidden of ["tokenHash", "sourceApprovalId", "sourceCopyId", "salonId", "snapshot"]) assert(!timelineText.includes(forbidden), `timeline omits ${forbidden}`);

    const routeSalon = `${salonId}-route`;
    await upsertSalonServiceConfig(routeSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "save", priceCents: 8000, durationMinutes: 90, enabledAddonIds: [] });
    await upsertSalonServiceConfig(routeSalon, { catalogServiceId: "default-nails-gel-x", lifecycleAction: "activate" });
    const routeOffer = await createSalonOfferCatalogEntry(routeSalon, { name: "Route Offer", description: "Route contract", serviceId: "default-nails-gel-x", addonIds: [] });
    assert(!("error" in routeOffer), "route offer fixture created");
    const routeApproval = await seed(routeSalon, "approved", { serviceIds: ["default-nails-gel-x"], salonOfferCatalogId: routeOffer.entry.id });
    const routeCookie = `${VMB_TRIAL_COOKIE}=${createVmbSalonSession(routeSalon)}`;
    const sendResponse = await postSentInvite(new NextRequest("http://localhost/api/vmb/sent-invites", { method: "POST", headers: { cookie: routeCookie, "content-type": "application/json" }, body: JSON.stringify({ approvalId: routeApproval.approval.id }) }));
    assert(sendResponse.status === 200, "signed salon can send owned eligible invite");
    const sendText = await sendResponse.text();
    for (const forbidden of ["tokenHash", "sourceApprovalId", "sourceCopyId", "salonId", "snapshot"]) assert(!sendText.includes(forbidden), `send response omits ${forbidden}`);
    const sendJson = JSON.parse(sendText) as { recipientUrl: string; sentInvite: { id: string } };
    const routeToken = decodeURIComponent(new URL(sendJson.recipientUrl).pathname.split("/").pop()!);
    const routeContact = normalizeRecipientContact("route@example.com");
    assert(routeContact, "route claim contact normalizes");
    const routeClaim = await claimSentInvite({ token: routeToken, clientName: "Jordan", recipientContactSummary: maskRecipientContactSummary(routeContact), recipientContactHash: hashInviteClaimContact(sendJson.sentInvite.id, routeContact) });
    assert(routeClaim.ok, "route invite claim fixture created");
    const redeemResponse = await postRedeem(new NextRequest(`http://localhost/api/vmb/sent-invites/${sendJson.sentInvite.id}/redeem`, { method: "POST", headers: { cookie: routeCookie } }), { params: Promise.resolve({ sentInviteId: sendJson.sentInvite.id }) });
    assert(redeemResponse.status === 200, "signed salon can redeem owned claim");
    const redeemText = await redeemResponse.text();
    for (const forbidden of ["tokenHash", "sourceApprovalId", "sourceCopyId", "salonId", "snapshot"]) assert(!redeemText.includes(forbidden), `redeem response omits ${forbidden}`);

    delete process.env.VMB_MONEY_TEST_MEMORY;
    const unavailableCreate = await createSentInvite({ salonId, sourceApprovalId: "unavailable", sourceCopyId: copyId, snapshot: sent.sentInvite.snapshot, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    assert("error" in unavailableCreate && unavailableCreate.status === 503, "create rejects unavailable writable backend");
    assert("error" in await markSentInviteOpened(sent.sentInvite), "open rejects unavailable writable backend");
    assert(!(await claimSentInvite(claimInput)).ok, "claim rejects unavailable writable backend");
    assert("error" in await redeemSentInvite(salonId, sent.sentInvite.id), "redeem rejects unavailable writable backend");
    process.env.VMB_MONEY_TEST_MEMORY = "1";
  });
  console.log("OK: VMB sent invite money rail tests passed");
}

void run();
