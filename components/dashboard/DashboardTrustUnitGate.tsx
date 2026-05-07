"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrustUnitFormationModal,
  type TuModalRequest,
} from "@/components/dashboard/TrustUnitFormationModal";
import { TrustRequestCard } from "@/components/dashboard/TrustRequestCard";

const storageKey = (userId: string) => `famtree_tu_modal_dismissed_ids:${userId}`;

function readDismissedFromStorage(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeDismissedToStorage(userId: string, ids: Set<string>) {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

export function DashboardTrustUnitGate({
  initialRequests,
  currentUserId,
}: {
  initialRequests: TuModalRequest[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [dismissedModalIds, setDismissedModalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRequests(initialRequests);
    const activeIds = new Set(initialRequests.map((r) => r.id));
    const dismissed = readDismissedFromStorage(currentUserId);
    const pruned = new Set(Array.from(dismissed).filter((id) => activeIds.has(id)));
    writeDismissedToStorage(currentUserId, pruned);
    setDismissedModalIds(pruned);
  }, [initialRequests, currentUserId]);

  const persistModalDismiss = (requestId: string) => {
    setDismissedModalIds((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      writeDismissedToStorage(currentUserId, next);
      return next;
    });
  };

  const modalRequest = useMemo(() => {
    return requests.find((r) => !dismissedModalIds.has(r.id));
  }, [requests, dismissedModalIds]);

  const handleHoldOrLater = () => {
    if (modalRequest) persistModalDismiss(modalRequest.id);
  };

  const handleAfterAction = () => {
    router.refresh();
  };

  const handleResolvedCard = (requestId: string) => {
    setRequests((cur) => cur.filter((r) => r.id !== requestId));
    persistModalDismiss(requestId);
    router.refresh();
  };

  const handleHoldCard = (requestId: string) => {
    persistModalDismiss(requestId);
  };

  if (requests.length === 0) return null;

  return (
    <>
      {modalRequest ? (
        <TrustUnitFormationModal
          request={modalRequest}
          currentUserId={currentUserId}
          onHoldOrLater={handleHoldOrLater}
          onAfterAction={handleAfterAction}
        />
      ) : null}

      <div>
        <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1c1917", marginBottom: "14px" }}>
          Trust Unit approvals
        </h2>
        <p className="mb-3 text-xs leading-snug text-stone-500">
          Same proposals as the popup — your sponsor network may propose a Trust Unit when three members align.
          Accept or hold anytime here. Hold hides the overlay until your next visit this session.
        </p>
        <div className="space-y-3">
          {requests.map((request) => (
            <TrustRequestCard
              key={request.id}
              request={request}
              currentUserId={currentUserId}
              onResolved={(requestId) => handleResolvedCard(requestId)}
              onHold={() => handleHoldCard(request.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
