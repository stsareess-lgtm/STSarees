"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  cdnImageUrl,
  cdnPresetForWidth,
  type CdnImageOptions,
} from "@/lib/media/cdn-image";
import { DEFAULT_SAREE_PLACEHOLDER } from "@/lib/supabase/seedData/collectionPlaceholders";

type Props = Omit<ImageProps, "onError" | "src"> & {
  src: string;
  /**
   * When set, rewrite R2/CDN URLs through Cloudflare Images resize
   * (.../cdn/...). Ignored for local assets / legacy mode.
   * Prefer `cdnOptions` when a named preset (e.g. heroMobile) must match preload.
   */
  optimizeWidth?: number;
  /** Explicit CDN options; wins over optimizeWidth when both are set. */
  cdnOptions?: CdnImageOptions;
};

/**
 * Storefront photo with Cloudflare resize + local fallback on load failure.
 */
export function StorefrontImage({
  src,
  alt,
  optimizeWidth,
  cdnOptions,
  ...props
}: Props) {
  const [failed, setFailed] = useState(false);

  const optimizedSrc = useMemo(() => {
    if (!src || src === DEFAULT_SAREE_PLACEHOLDER) return src;
    if (cdnOptions) return cdnImageUrl(src, cdnOptions);
    if (optimizeWidth == null) return src;
    return cdnImageUrl(src, cdnPresetForWidth(optimizeWidth));
  }, [src, optimizeWidth, cdnOptions]);

  useEffect(() => {
    setFailed(false);
  }, [optimizedSrc]);

  const displaySrc =
    !optimizedSrc || failed || optimizedSrc === DEFAULT_SAREE_PLACEHOLDER
      ? DEFAULT_SAREE_PLACEHOLDER
      : optimizedSrc;

  return (
    <Image
      src={displaySrc}
      alt={alt ?? ""}
      {...props}
      onError={() => {
        if (displaySrc !== DEFAULT_SAREE_PLACEHOLDER) setFailed(true);
      }}
    />
  );
}
