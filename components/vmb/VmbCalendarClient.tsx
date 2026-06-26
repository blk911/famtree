"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { SalonCalendar, SalonCalendarDay } from "@/lib/vmb/calendar/salon-calendar-store";

type CalendarResponse = {
  ok: boolean;
  calendar?: SalonCalendar;
  error?: string;
};

const TIME_OPTIONS = Array.from({ length: ((21 * 60 + 45) - 6 * 60) / 15 + 1 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { minutes, label: `${hour12}:${String(minute).padStart(2, "0")} ${suffix}` };
});

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
      setCalendar(json.calendar);
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
      setCalendar(json.calendar);
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
                Showing 6:00 AM through 9:45 PM. The grid displays 30-minute lanes and supports 15-minute scheduling.
              </p>
            </div>
            <div className="vmb-calendar-week__actions">
              <button type="button" onClick={setDefaultWeek} disabled={saving}>Use 8-6 Default</button>
              <button type="button" className="is-primary" onClick={() => void saveWeek()} disabled={saving}>
                {saving ? "Saving..." : "Save My Week"}
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
                  <label>
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(event) => updateDay(day.day, { enabled: event.target.checked })}
                    />
                    <span>{day.label}</span>
                  </label>
                  <strong>{daySummary(day)}</strong>
                </header>
                <div className="vmb-calendar-week__time-controls">
                  <label>
                    Start
                    <select
                      value={day.startMinutes}
                      disabled={!day.enabled}
                      onChange={(event) => updateDay(day.day, { startMinutes: Number(event.target.value) })}
                    >
                      {TIME_OPTIONS.map((option) => (
                        <option key={option.minutes} value={option.minutes}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    End
                    <select
                      value={day.endMinutes}
                      disabled={!day.enabled}
                      onChange={(event) => updateDay(day.day, { endMinutes: Number(event.target.value) })}
                    >
                      {TIME_OPTIONS.map((option) => (
                        <option key={option.minutes} value={option.minutes}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="vmb-calendar-week__lanes" aria-hidden="true">
                  {TIME_OPTIONS.filter((_, index) => index % 2 === 0).map((option) => {
                    const active = day.enabled && option.minutes >= day.startMinutes && option.minutes < day.endMinutes;
                    return <span key={option.minutes} className={active ? "is-active" : ""} title={option.label} />;
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
