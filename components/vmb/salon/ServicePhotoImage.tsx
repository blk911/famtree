"use client";

import Image from "next/image";
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
  if (fill) {
    return (
      <Image
        src={resolved.imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={resolved.imageUrl}
      alt={alt}
      width={width ?? 56}
      height={height ?? 56}
      sizes={sizes}
      className={className}
      priority={priority}
    />
  );
}
