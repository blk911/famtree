"use client";

import { Suspense } from "react";
import { TranspoProviderCapacityClient } from "@/components/admin/intelligence/transpo/TranspoProviderCapacityClient";

export default function TranspoProviderCapacityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-stone-500">Loading provider registry…</div>}>
      <TranspoProviderCapacityClient />
    </Suspense>
  );
}
