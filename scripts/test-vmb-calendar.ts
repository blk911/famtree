import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as getCalendar, PUT as putCalendar } from "../app/api/vmb/calendar/route";
import { GET as getBookingSlots } from "../app/api/vmb/client-invites/booking-slots/route";
import { createVmbSalonSession } from "../lib/vmb/salon-authority";
import { getBookableSlots, getSalonCalendar, saveSalonCalendar } from "../lib/vmb/calendar/salon-calendar-store";
import { getVmbSalonCalendarsFile, VMB_TRIAL_COOKIE } from "../lib/vmb/paths";
import { createSentInvite, resetSentInviteMemoryStoreForTests } from "../lib/vmb/invites/sent-invite-store";

delete process.env.DATABASE_URL;
delete process.env.VERCEL;
process.env.VMB_MONEY_TEST_MEMORY = "1";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function isolated(run: () => Promise<void>) {
  const file = getVmbSalonCalendarsFile();
  const original = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "[]", "utf8");
  resetSentInviteMemoryStoreForTests();
  try {
    await run();
  } finally {
    original === null ? fs.rmSync(file, { force: true }) : fs.writeFileSync(file, original, "utf8");
  }
}

async function run() {
  await isolated(async () => {
    const salonId = "calendar-test-salon";
    const calendar = await getSalonCalendar(salonId);
    assert(calendar.days.length === 7, "calendar has full week");
    assert(calendar.days[1].startMinutes === 480 && calendar.days[1].endMinutes === 1080, "default week opens 8 to 6");
    assert(calendar.displayStartMinutes === 360 && calendar.displayEndMinutes === 1305, "display supports 6am through 9:45pm");

    const slots = getBookableSlots(calendar, { day: 1, limit: 3 });
    assert(slots.map((slot) => slot.label).join("|") === "Mon · 8:00 AM|Mon · 8:30 AM|Mon · 9:00 AM", "slots are 30-minute UI lanes");

    const cookie = `${VMB_TRIAL_COOKIE}=${createVmbSalonSession(salonId)}`;
    const unsigned = await getCalendar(new NextRequest("http://localhost/api/vmb/calendar"));
    assert(unsigned.status === 401, "calendar requires signed salon session");

    const savedResponse = await putCalendar(new NextRequest("http://localhost/api/vmb/calendar", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        calendar: {
          days: calendar.days.map((day) => day.day === 2 ? { ...day, enabled: true, startMinutes: 9 * 60 + 15, endMinutes: 12 * 60 + 45 } : day),
        },
      }),
    }));
    assert(savedResponse.status === 200, "signed salon can save calendar");
    const saved = await savedResponse.json() as { calendar: typeof calendar };
    assert(saved.calendar.days[2].startMinutes === 555 && saved.calendar.days[2].endMinutes === 765, "15-minute boundaries are persisted");

    const directSave = await saveSalonCalendar(salonId, {
      days: calendar.days.map((day) => day.day === 3 ? { ...day, enabled: true, startMinutes: 10 * 60, endMinutes: 11 * 60 } : { ...day, enabled: false }),
    });
    assert(directSave.ok, "calendar store saves directly for slot fixture");

    const sent = await createSentInvite({
      salonId,
      sourceApprovalId: "calendar-source-1",
      sourceCopyId: "calendar-copy-1",
      snapshot: {
        salonDisplayName: "Calendar Salon",
        providerName: "Deb",
        recipientName: "Client",
        inviteTypeLabel: "Birthday Celebration",
        headline: "Birthday gift",
        body: "Book your gift.",
        ctaLabel: "Open",
        services: ["Gel-X Extensions"],
        rewards: ["Chrome"],
        expirationLabel: "Valid for 30 days",
        termsText: "Valid for 30 days",
        priceLabel: "$90",
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert(!("error" in sent), "sent invite fixture created");
    const slotResponse = await getBookingSlots(new NextRequest(`http://localhost/api/vmb/client-invites/booking-slots?token=${encodeURIComponent(sent.recipientToken)}`));
    assert(slotResponse.status === 200, "booking slots resolve from secure invite token");
    const slotJson = await slotResponse.json() as { slots: { label: string }[] };
    assert(slotJson.slots[0]?.label === "Wed · 10:00 AM", "booking slots use sender salon calendar");
  });

  console.log("OK: VMB salon calendar tests passed");
}

void run();
