import { notFound } from "next/navigation";
import { ServicePhotoImage } from "@/components/vmb/salon/ServicePhotoImage";
import { getServiceImage } from "@/lib/vmb/assets";
import type { ServicePhotoCategory } from "@/lib/vmb/assets/service-image-types";
import { getActiveServiceAssets } from "@/lib/vmb/assets/service-photo-library";

const SAMPLE_CATEGORIES: ServicePhotoCategory[] = [
  "gel_manicure",
  "builder_gel",
  "structured_gel",
  "gel_x",
  "acrylic",
  "pedicure",
  "fill_refresh",
  "generic_salon",
];

export default function VmbImageSmokePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0 }}>VMB image smoke (dev)</h1>
        <p style={{ margin: "8px 0 0", color: "#57534e" }}>
          One resolver sample per category — verify URLs and Next Image loading.
        </p>
      </header>

      <ul style={{ display: "grid", gap: 20, listStyle: "none", margin: 0, padding: 0 }}>
        {SAMPLE_CATEGORIES.map((category) => {
          const sampleAsset = getActiveServiceAssets(category)[0];
          const resolved = getServiceImage({
            serviceName: sampleAsset?.title ?? category,
            serviceId: sampleAsset?.id ?? category,
            salonId: "smoke-salon",
          });
          const hostname = (() => {
            try {
              return new URL(resolved.imageUrl).hostname;
            } catch {
              return "invalid-url";
            }
          })();

          return (
            <li
              key={category}
              style={{
                border: "1px solid #e7e5e4",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <div style={{ position: "relative", height: 180 }}>
                <ServicePhotoImage
                  resolved={resolved}
                  alt={resolved.title}
                  sizes="400px"
                />
              </div>
              <div style={{ padding: 12, fontSize: 13, display: "grid", gap: 4 }}>
                <strong>{category}</strong>
                <span>
                  {resolved.source} · {resolved.assetId ?? "no-asset"}
                </span>
                <span>{hostname}</span>
                <code style={{ fontSize: 11, wordBreak: "break-all" }}>{resolved.imageUrl}</code>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
