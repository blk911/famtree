"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { LoadYourBookCta } from "@/components/vmb/LoadYourBookCta";
import { VMB_BOOK_LOCKED_MESSAGE } from "@/lib/vmb/book-load-cta";
import { logTodayLockBranch } from "@/lib/vmb/today-lock-debug";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { SalonClaimTimelineDto } from "@/lib/vmb/invites/sent-invite-dto";

export function VmbActivityClient() {
  const [summary, setSummary] = useState<TaikosActivitySummary | null>(null);
  const [bookingRequests, setBookingRequests] = useState<SalonClaimTimelineDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, sentInvitesResponse] = await Promise.all([
        fetch("/api/taikos/activity", { cache: "no-store", credentials: "include" }),
        fetch("/api/vmb/sent-invites", { cache: "no-store", credentials: "include" }),
      ]);
      const json = (await res.json()) as { ok: boolean; data?: TaikosActivitySummary };
      setSummary(res.ok && json.ok && json.data ? json.data : null);
      if (sentInvitesResponse.ok) {
        const sentJson = (await sentInvitesResponse.json()) as { ok?: boolean; timeline?: SalonClaimTimelineDto[] };
        setBookingRequests((sentJson.timeline ?? []).filter((row) => row.bookingRequest));
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <VmbPageFrame
      title="Activity"
      subtitle="What happened in your salon — business stories, not debug logs."
    >
      <VmbBookingActivity bookingRequests={bookingRequests} />
      {loading ? (
        <p className="vmb-page-state">Loading activity…</p>
      ) : summary ? (
        <ActivityTimeline summary={summary} />
      ) : (
        <ActivityLockedState />
      )}
    </VmbPageFrame>
  );
}

function VmbBookingActivity({ bookingRequests }: { bookingRequests: SalonClaimTimelineDto[] }) {
  if (bookingRequests.length === 0) return null;
  return (
    <section className="vmb-booking-activity">
      <p className="vmb-booking-activity__eyebrow">Client booking requests</p>
      <div className="vmb-booking-activity__list">
        {bookingRequests.map(({ sentInvite, claim, bookingRequest }) => (
          <article key={`${sentInvite.id}-${bookingRequest?.createdAt ?? sentInvite.sentAt}`}>
            <div>
              <strong>{sentInvite.recipientName}</strong>
              <span>{sentInvite.inviteTypeLabel}</span>
            </div>
            <p>{bookingRequest?.requestedSlot ?? "Time requested"}</p>
            <p>{bookingRequest?.serviceLine ?? "Private salon gift"}</p>
            {claim ? <em>{claim.recipientContactSummary}</em> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityLockedState() {
  useEffect(() => {
    logTodayLockBranch({
      file: "components/vmb/VmbActivityClient.tsx",
      component: "ActivityLockedState",
      message: "Connect your book to unlock activity.",
      dataLoaded: false,
    });
  }, []);

  return (
    <div className="vmb-page-state">
      <p>{VMB_BOOK_LOCKED_MESSAGE}</p>
      <p style={{ marginTop: 16 }}>
        <LoadYourBookCta />
      </p>
    </div>
  );
}
