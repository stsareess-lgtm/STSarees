import { RobustNavLink } from "@/components/layouts/RobustNavLink";
import { BrandWordmark } from "@/components/layouts/BrandWordmark";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "nav" | "sidebar" | "footer";

type Props = {
  className?: string;
  size?: BrandLogoSize;
  align?: "left" | "center";
};

export function BrandLogo({ className, size = "nav", align = "left" }: Props) {
  const visualSize: BrandLogoSize =
    size === "sidebar" || size === "footer" ? "nav" : size;

  const detailTextClassBySize: Record<BrandLogoSize, string> = {
    nav: "text-[7px] leading-[1.1] tracking-[0.04em] sm:text-[7.5px]",
    md: "text-[8.5px] leading-[1.1] tracking-[0.04em]",
    sm: "text-[8.75px] leading-[1.12] tracking-[0.04em]",
    lg: "text-[11px] leading-[1.14] tracking-[0.045em]",
    sidebar: "text-[6.5px] leading-[1.08] tracking-[0.03em]",
    footer: "text-[6.5px] leading-[1.08] tracking-[0.03em]",
  };

  const detailPositionClassBySize: Record<BrandLogoSize, string> = {
    nav: "left-[53px] right-0 top-[29px] sm:top-[37px]",
    md: "left-[72px] right-0 top-[43px]",
    sm: "left-[76px] right-0 top-[47px]",
    lg: "left-[96px] right-0 top-[56px]",
    sidebar: "left-[53px] right-0 top-[29.5px] sm:top-[33.5px]",
    footer: "left-[53px] right-0 top-[29.5px] sm:top-[33.5px]",
  };

  const detailGapClassBySize: Record<BrandLogoSize, string> = {
    nav: "gap-[1.5px]",
    md: "gap-[1.5px]",
    sm: "gap-[2px]",
    lg: "gap-[2px]",
    sidebar: "gap-[1.5px]",
    footer: "gap-[1.5px]",
  };

  return (
    <div
      className={cn(
        "relative inline-flex w-fit shrink-0 items-start justify-start overflow-visible",
        align === "center" && "mx-auto",
        className,
      )}
    >
      <RobustNavLink
        href="/"
        aria-label={siteConfig.shortName}
        className="inline-flex w-fit shrink-0 items-center justify-start touch-manipulation"
      >
        <BrandWordmark size={visualSize} align="left" />
      </RobustNavLink>

      <div
        className={cn(
          "absolute z-[1] inline-flex flex-col items-center whitespace-nowrap text-center",
          detailPositionClassBySize[size],
          detailGapClassBySize[size],
          detailTextClassBySize[size],
        )}
      >
        <p className="font-semibold uppercase text-[#111111]">
          {siteConfig.tagline}
        </p>
        <a
          href={siteConfig.phoneHref}
          className="font-medium text-[#222222] underline-offset-2 transition-colors hover:text-[#000000] hover:underline"
        >
          {siteConfig.phone}
        </a>
      </div>
    </div>
  );
}

export default BrandLogo;
