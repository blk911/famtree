import { notFound } from "next/navigation";
import { VmbDevStateControls } from "@/components/vmb/VmbDevStateControls";
import { ServicePhotoImage } from "@/components/vmb/salon/ServicePhotoImage";
import { getInviteArtImage, getServiceImage } from "@/lib/vmb/assets";
import type { InviteArtCategory } from "@/lib/vmb/assets/invite-art-types";
import type { ServicePhotoCategory } from "@/lib/vmb/assets/service-image-types";
import { getActiveInviteArtAssets } from "@/lib/vmb/assets/invite-art-library";
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

const INVITE_ART_CATEGORIES: InviteArtCategory[] = [
  "referral_invite",
  "birthday_card",
  "open_slot_fill",
  "pcn_invite",
  "refresh_card",
  "reactivation_card",
  "vip_thank_you",
  "first_visit",
  "generic_invite",
];

function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
}

export default function VmbImageSmokePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0 }}>VMB image smoke (dev)</h1>
        <p style={{ margin: "8px 0 0", color: "#57534e" }}>
          Resolver samples by category — verify URLs, category labels, source badges, and image loading.
        </p>
      </header>

      <VmbDevStateControls />

      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Service photos</h2>
      <ul style={{ display: "grid", gap: 20, listStyle: "none", margin: 0, padding: 0 }}>
        {SAMPLE_CATEGORIES.map((category) => {
          const sampleAsset = getActiveServiceAssets(category)[0];
          const resolved = getServiceImage({
            serviceName: sampleAsset?.title ?? category,
            serviceId: sampleAsset?.id ?? category,
            salonId: "smoke-salon",
          });
          const hostname = hostnameFor(resolved.imageUrl);

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
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Invite art</h2>
        <ul style={{ display: "grid", gap: 20, listStyle: "none", margin: 0, padding: 0 }}>
          {INVITE_ART_CATEGORIES.map((category) => {
            const sampleAsset = getActiveInviteArtAssets(category)[0];
            const resolved = getInviteArtImage({
              templateType: category,
              inviteId: sampleAsset?.id ?? category,
              salonId: "smoke-salon",
            });
            const hostname = hostnameFor(resolved.imageUrl);

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolved.imageUrl}
                    alt={resolved.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
      </section>
    </main>
  );
}
