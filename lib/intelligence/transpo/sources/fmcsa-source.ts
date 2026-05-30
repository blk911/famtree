// lib/intelligence/transpo/sources/fmcsa-source.ts
// Transpo FMCSA / FM source adapter (public facade).
//
// runFmcsaTestPull() resolves the configured FMCSA provider (mock | csv | live)
// via TRANSPO_FMCSA_PROVIDER and runs it. The default "mock" provider preserves
// the original deterministic test-pull behavior. No live API keys are required
// for the build to pass; live/CSV failures degrade gracefully with a clear
// sourceMode + message.

import type { TranspoSourceRunInput, TranspoCarrierSourceRecord } from "../types";
import {
  runFmcsaProvider,
  resolveFmcsaProviderKind,
  type FmcsaProviderKind,
  type FmcsaProviderResult,
} from "./fmcsa-provider";

export type { FmcsaProviderKind };
export { resolveFmcsaProviderKind };

// FMCSA pulls accept the shared Transpo source-run input contract.
export type FmcsaPullInput = TranspoSourceRunInput;

// FMCSA records conform to the shared carrier source record contract.
export type FmcsaCarrierRecord = TranspoCarrierSourceRecord;

// Result now carries provider provenance + a graceful-failure message.
export type FmcsaPullResult = FmcsaProviderResult;

/**
 * Run an FMCSA data pull using the resolved provider.
 *
 * - mock (default): deterministic sample carriers, sourceMode "mock_fmcsa_test".
 * - csv: reads a local CSV import, sourceMode "csv_import".
 * - live: placeholder, returns ok:false with sourceMode "live_api".
 */
export async function runFmcsaTestPull(
  input: FmcsaPullInput,
): Promise<FmcsaPullResult> {
  return runFmcsaProvider(input);
}
