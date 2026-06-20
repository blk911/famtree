"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getFallbackServiceAsset } from "@/lib/vmb/assets/service-photo-library";
import type { ResolvedServiceImage } from "@/lib/vmb/assets/service-image-types";

type Props = {
  resolved: ResolvedServiceImage;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  width?: number;
  height?: number;
  fill?: boolean;
};

export function ServicePhotoImage({
  resolved,
  alt,
  className = "object-cover",
  sizes,
  priority = false,
  width,
  height,
  fill = true,
}: Props) {
  const fallbackUrl = getFallbackServiceAsset().imageUrl;
  const [src, setSrc] = useState(resolved.imageUrl);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    setSrc(resolved.imageUrl);
    setUsingFallback(false);
  }, [resolved.imageUrl]);

  const handleError = () => {
    if (!usingFallback) {
      setSrc(fallbackUrl);
      setUsingFallback(true);
    }
  };

  const debugBadge =
    process.env.NODE_ENV !== "production" ? (
      <div className="pointer-events-none absolute bottom-1 left-1 z-10 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
        {resolved.source} · {resolved.assetId ?? "no-asset"}
      </div>
    ) : null;

  if (fill) {
    return (
      <>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={className}
          priority={priority}
          onError={handleError}
        />
        {debugBadge}
      </>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 56}
      height={height ?? 56}
      sizes={sizes}
      className={className}
      priority={priority}
      onError={handleError}
    />
  );
}
