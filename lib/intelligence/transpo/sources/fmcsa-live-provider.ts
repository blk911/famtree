// lib/intelligence/transpo/sources/fmcsa-live-provider.ts
// Live FMCSA provider — placeholder only. Does NOT call any external API yet.
// Fails gracefully with a clear sourceMode/status so the build and UI never
// depend on live credentials.

import type {
  TranspoSourceRunInput,
  TranspoSourceMode,
  TranspoCarrierSourceRecord,
} from "../types";

export type FmcsaLiveResult = {
  ok: boolean;
  sourceMode: TranspoSourceMode;
  records: TranspoCarrierSourceRecord[];
  message?: string;
};

export async function runFmcsaLivePull(
  _input: TranspoSourceRunInput,
): Promise<FmcsaLiveResult> {
  return {
    ok: false,
    sourceMode: "live_api",
    records: [],
    message: "Live FMCSA provider not connected yet.",
  };
}
