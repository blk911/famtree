"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { SalonCalendar, SalonCalendarDay } from "@/lib/vmb/calendar/salon-calendar-store";

type CalendarResponse = {
  ok: boolean;
  calendar?: SalonCalendar;
  error?: string;
};

const SELECT_START_MINUTES = 6 * 60;
const SELECT_END_MINUTES = 21 * 60;
const SELECT_STEP_MINUTES = 30;

const TIME_OPTIONS = Array.from({ length: (SELECT_END_MINUTES - SELECT_START_MINUTES) / SELECT_STEP_MINUTES + 1 }, (_, index) => {
  const minutes = SELECT_START_MINUTES + index * SELECT_STEP_MINUTES;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { minutes, label: `${hour12}:${String(minute).padStart(2, "0")} ${suffix}` };
});

const START_TIME_OPTIONS = TIME_OPTIONS.filter((option) => option.minutes < SELECT_END_MINUTES);
const HOUR_ROWS = Array.from({ length: SELECT_END_MINUTES / 60 - SELECT_START_MINUTES / 60 + 1 }, (_, index) => {
  return SELECT_START_MINUTES + index * 60;
});

function snapToSelectOption(minutes: number): number {
  const snapped = Math.round(minutes / SELECT_STEP_MINUTES) * SELECT_STEP_MINUTES;
  return Math.min(SELECT_END_MINUTES, Math.max(SELECT_START_MINUTES, snapped));
}

function snapCalendarToSelectOptions(calendar: SalonCalendar): SalonCalendar {
  return {
    ...calendar,
    days: calendar.days.map((day) => {
      const startMinutes = Math.min(SELECT_END_MINUTES - SELECT_STEP_MINUTES, snapToSelectOption(day.startMinutes));
      const endMinutes = Math.max(startMinutes + SELECT_STEP_MINUTES, snapToSelectOption(day.endMinutes));
      return {
        ...day,
        startMinutes,
        endMinutes: Math.min(SELECT_END_MINUTES, endMinutes),
      };
    }),
  };
}

function timeLabel(minutes: number): string {
  return TIME_OPTIONS.find((option) => option.minutes === minutes)?.label ?? `${minutes} min`;
}

function daySummary(day: SalonCalendarDay): string {
  return day.enabled ? `${timeLabel(day.startMinutes)}-${timeLabel(day.endMinutes)}` : "Closed";
}

export function VmbCalendarClient() {
  const [calendar, setCalendar] = useState<SalonCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/vmb/calendar", { cache: "no-store", credentials: "include" });
      const json = (await response.json()) as CalendarResponse;
      if (!response.ok || !json.ok || !json.calendar) throw new Error(json.error ?? "Could not load calendar.");
      setCalendar(snapCalendarToSelectOptions(json.calendar));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeDays = useMemo(() => calendar?.days.filter((day) => day.enabled).length ?? 0, [calendar]);

  function updateDay(dayIndex: number, patch: Partial<SalonCalendarDay>) {
    setCalendar((current) => current ? {
      ...current,
      days: current.days.map((day) => day.day === dayIndex ? { ...day, ...patch } : day),
    } : current);
  }

  function setDefaultWeek() {
    if (!calendar) return;
    setCalendar({
      ...calendar,
      days: calendar.days.map((day) => ({
        ...day,
        enabled: day.day !== 0,
        startMinutes: 8 * 60,
        endMinutes: 18 * 60,
      })),
    });
    setMessage("Default week staged: Monday-Saturday, 8:00 AM-6:00 PM.");
  }

  async function saveWeek() {
    if (!calendar) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/vmb/calendar", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calendar }),
      });
      const json = (await response.json()) as CalendarResponse;
      if (!response.ok || !json.ok || !json.calendar) throw new Error(json.error ?? "Could not save calendar.");
      setCalendar(snapCalendarToSelectOptions(json.calendar));
      setMessage("Week saved. Client booking options will use this salon calendar.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save calendar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <VmbPageFrame
      title="Calendar"
      subtitle="Set your working week. Client invite booking options will resolve against these salon hours."
      width="full"
    >
      {loading ? (
        <p className="vmb-page-state">Loading calendar...</p>
      ) : !calendar ? (
        <p className="vmb-page-state">{message ?? "Calendar unavailable."}</p>
      ) : (
        <section className="vmb-calendar-week">
          <header className="vmb-calendar-week__header">
            <div>
              <p className="vmb-calendar-week__eyebrow">Set My Week</p>
              <h2>Salon booking availability</h2>
              <p>
                Choose the days you are open, then set the open and close time. Client invite booking will use this week.
              </p>
            </div>
            <div className="vmb-calendar-week__actions">
              <button type="button" onClick={setDefaultWeek} disabled={saving}>Use 8-6 Week</button>
              <button type="button" className="is-primary" onClick={() => void saveWeek()} disabled={saving}>
                {saving ? "Saving..." : "Save Calendar"}
              </button>
            </div>
          </header>

          <div className="vmb-calendar-week__summary">
            <strong>{activeDays} open days</strong>
            <span>Version {calendar.version}</span>
            {message ? <em>{message}</em> : null}
          </div>

          <div className="vmb-calendar-week__grid" role="table" aria-label="Salon weekly availability">
            {calendar.days.map((day) => (
              <article key={day.day} className={`vmb-calendar-week__day${day.enabled ? " is-open" : ""}`}>
                <header>
                  <div>
                    <span>{day.label}</span>
                    <strong>{daySummary(day)}</strong>
                  </div>
                  <div className="vmb-calendar-week__day-toggle" aria-label={`${day.label} open state`}>
                    <button
                      type="button"
                      className={day.enabled ? "is-selected" : ""}
                      onClick={() => updateDay(day.day, { enabled: true })}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={!day.enabled ? "is-selected" : ""}
                      onClick={() => updateDay(day.day, { enabled: false })}
                    >
                      Closed
                    </button>
                  </div>
                </header>
                <div className="vmb-calendar-week__time-controls">
                  <label>
                    Opens
                    <select
                      value={day.startMinutes}
                      disabled={!day.enabled}
                      onChange={(event) => {
                        const startMinutes = Number(event.target.value);
                        updateDay(day.day, {
                          startMinutes,
                          endMinutes: Math.max(day.endMinutes, startMinutes + SELECT_STEP_MINUTES),
                        });
                      }}
                    >
                      {START_TIME_OPTIONS.map((option) => (
                        <option key={option.minutes} value={option.minutes}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Closes
                    <select
                      value={day.endMinutes}
                      disabled={!day.enabled}
                      onChange={(event) => {
                        const endMinutes = Number(event.target.value);
                        updateDay(day.day, { endMinutes: Math.max(endMinutes, day.startMinutes + SELECT_STEP_MINUTES) });
                      }}
                    >
                      {TIME_OPTIONS.filter((option) => option.minutes > day.startMinutes).map((option) => (
                        <option key={option.minutes} value={option.minutes}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="vmb-calendar-week__hours" aria-hidden="true">
                  {HOUR_ROWS.map((minutes) => {
                    const active = day.enabled && minutes >= day.startMinutes && minutes < day.endMinutes;
                    return (
                      <span key={minutes} className={active ? "is-active" : ""}>
                        {timeLabel(minutes)}
                      </span>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </VmbPageFrame>
  );
}
