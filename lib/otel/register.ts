// OTEL DISABLED FOR LOCAL DEV
// Safe to re-enable later if needed

/*
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";

let sdk: NodeSDK | null = null;

export function initTracing() {
  if (sdk) return;
  if (process.env.OTEL_SDK_DISABLED === "true") return;

  sdk = new NodeSDK({
    resource: new Resource({
      "service.name": process.env.OTEL_SERVICE_NAME ?? "famtree-next",
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
}
*/

/** No-op so any future re-enable can wire the same export. */
export function initTracing(): void {}
