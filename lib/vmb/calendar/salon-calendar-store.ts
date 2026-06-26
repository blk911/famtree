import { randomUUID } from "crypto";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbSalonCalendarsFile } from "@/lib/vmb/paths";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";

export type SalonCalendarDay = {
  day: number;
  label: string;
  enabled: boolean;
  startMinutes: number;
  endMinutes: number;
};

export type SalonCalendar = {
  salonId: string;
  version: number;
  slotStepMinutes: 30;
  bookingGranularityMinutes: 15;
  displayStartMinutes: number;
  displayEndMinutes: number;
  days: SalonCalendarDay[];
  updatedAt: string;
};

export type SalonCalendarSlot = {
  startsAtMinutes: number;
  label: string;
  day: number;
  dayLabel: string;
};

type StoredSalonCalendar = {
  salonId: string;
  calendar: SalonCalendar;
};

type PayloadRow = { payload: unknown };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DISPLAY_START = 6 * 60;
const DISPLAY_END = 21 * 60 + 45;
const DEFAULT_START = 8 * 60;
const DEFAULT_END = 18 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampToDisplay(minutes: number): number {
  return Math.min(DISPLAY_END, Math.max(DISPLAY_START, Math.round(minutes / 15) * 15));
}

function isSalonCalendar(value: unknown): value is SalonCalendar {
  return isRecord(value)
    && typeof value.salonId === "string"
    && Array.isArray(value.days)
    && value.days.every((day) => isRecord(day) && typeof day.day === "number");
}

function isStoredSalonCalendar(value: unknown): value is StoredSalonCalendar {
  return isRecord(value) && typeof value.salonId === "string" && isSalonCalendar(value.calendar);
}

function parseCalendar(row: PayloadRow | undefined): SalonCalendar | undefined {
  return row && isSalonCalendar(row.payload) ? row.payload : undefined;
}

export function defaultSalonCalendar(salonId: string): SalonCalendar {
  const updatedAt = new Date().toISOString();
  return {
    salonId,
    version: 1,
    slotStepMinutes: 30,
    bookingGranularityMinutes: 15,
    displayStartMinutes: DISPLAY_START,
    displayEndMinutes: DISPLAY_END,
    days: DAY_LABELS.map((label, day) => ({
      day,
      label,
      enabled: day !== 0,
      startMinutes: DEFAULT_START,
      endMinutes: DEFAULT_END,
    })),
    updatedAt,
  };
}

export function normalizeSalonCalendar(salonId: string, input: Partial<SalonCalendar> | undefined): SalonCalendar {
  const base = defaultSalonCalendar(salonId);
  const daysByIndex = new Map((input?.days ?? []).map((day) => [day.day, day]));
  const days = base.days.map((baseDay) => {
    const incoming = daysByIndex.get(baseDay.day);
    const start = clampToDisplay(numberOr(incoming?.startMinutes, baseDay.startMinutes));
    const end = clampToDisplay(numberOr(incoming?.endMinutes, baseDay.endMinutes));
    return {
      ...baseDay,
      enabled: typeof incoming?.enabled === "boolean" ? incoming.enabled : baseDay.enabled,
      startMinutes: Math.min(start, Math.max(DISPLAY_START, end - 15)),
      endMinutes: Math.max(end, Math.min(DISPLAY_END, start + 15)),
    };
  });
  return {
    ...base,
    version: numberOr(input?.version, base.version),
    days,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : base.updatedAt,
  };
}

export function minutesToTimeLabel(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export async function getSalonCalendar(salonId: string): Promise<SalonCalendar> {
  if ((await resolveVmbStorageBackend()) === "postgres") {
    const rows = await prisma.$queryRaw<PayloadRow[]>`
      SELECT payload FROM vmb_salon_calendar WHERE salon_id = ${salonId} LIMIT 1
    `;
    return normalizeSalonCalendar(salonId, parseCalendar(rows[0]));
  }
  const all = await readJsonArray(getVmbSalonCalendarsFile(), isStoredSalonCalendar);
  return normalizeSalonCalendar(salonId, all.find((row) => row.salonId === salonId)?.calendar);
}

export async function saveSalonCalendar(
  salonId: string,
  input: Partial<SalonCalendar>,
): Promise<{ ok: true; calendar: SalonCalendar } | { ok: false; error: string }> {
  const current = await getSalonCalendar(salonId);
  const calendar = normalizeSalonCalendar(salonId, {
    ...current,
    ...input,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  });

  if ((await resolveVmbStorageBackend()) === "postgres") {
    await prisma.$executeRaw`
      INSERT INTO vmb_salon_calendar (salon_id, payload, updated_at)
      VALUES (${salonId}, ${JSON.stringify(calendar)}::jsonb, now())
      ON CONFLICT (salon_id)
      DO UPDATE SET payload = ${JSON.stringify(calendar)}::jsonb, updated_at = now()
    `;
    return { ok: true, calendar };
  }

  const all = await readJsonArray(getVmbSalonCalendarsFile(), isStoredSalonCalendar);
  const others = all.filter((row) => row.salonId !== salonId);
  const err = await writeJsonArray(getVmbSalonCalendarsFile(), [...others, { salonId, calendar }]);
  return err ? { ok: false, error: err } : { ok: true, calendar };
}

export function getBookableSlots(calendar: SalonCalendar, options: { day?: number; limit?: number } = {}): SalonCalendarSlot[] {
  const limit = options.limit ?? 48;
  const days = calendar.days.filter((day) => day.enabled && (options.day === undefined || day.day === options.day));
  const slots: SalonCalendarSlot[] = [];
  for (const day of days) {
    for (let minutes = day.startMinutes; minutes <= day.endMinutes - calendar.bookingGranularityMinutes; minutes += calendar.slotStepMinutes) {
      slots.push({
        startsAtMinutes: minutes,
        label: `${day.label} · ${minutesToTimeLabel(minutes)}`,
        day: day.day,
        dayLabel: day.label,
      });
      if (slots.length >= limit) return slots;
    }
  }
  return slots;
}

export function newBookingId(): string {
  return `booking-${randomUUID()}`;
}
