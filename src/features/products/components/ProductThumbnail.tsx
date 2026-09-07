import { cn, keytoUrl } from "@/lib/utils";
import { StorefrontImage } from "@/components/media/StorefrontImage";
import {
  productThumbnailFrameClass,
  productThumbnailImageClass,
  productThumbnailSizes,
} from "@/features/products/productThumbnail";

type Props = {
  imageKey: string;
  alt: string;
  /** Extra classes on the outer frame (e.g. rounded corners). */
  frameClassName?: string;
  /** Extra classes on the image (e.g. hover effects). */
  imageClassName?: string;
  priority?: boolean;
};

/**
 * Portrait product thumbnail with top-aligned crop — safe for varied upload ratios.
 */
export function ProductThumbnail({
  imageKey,
  alt,
  frameClassName,
  imageClassName,
  priority = false,
}: Props) {
  return (
    <div className={cn(productThumbnailFrameClass, frameClassName)}>
      <StorefrontImage
        src={keytoUrl(imageKey)}
        alt={alt}
        fill
        sizes={productThumbnailSizes}
        className={cn(productThumbnailImageClass, imageClassName)}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        optimizeWidth={400}
      />
    </div>
  );
}
