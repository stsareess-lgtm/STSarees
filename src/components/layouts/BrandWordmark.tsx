import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type BrandWordmarkSize =
  | "nav"
  | "md"
  | "footer"
  | "sidebar"
  | "sm"
  | "lg";

type Props = {
  className?: string;
  size?: BrandWordmarkSize;
  align?: "left" | "center";
};

const sizeMap = {
  nav: "text-[clamp(1.05rem,4vw,1.38rem)] leading-none",
  sidebar: "text-[1.12rem] leading-none sm:text-[1.18rem]",
  footer: "text-[1.3rem] leading-none sm:text-[1.4rem]",
  sm: "text-[1.75rem] sm:text-[1.85rem]",
  md: "text-[2rem] sm:text-[2.15rem]",
  lg: "text-[2.35rem] sm:text-[2.6rem]",
} as const;

const trackingMap = {
  nav: "tracking-[0.008em]",
  sidebar: "tracking-[0.025em]",
  footer: "tracking-[0.05em]",
  sm: "tracking-[0.05em]",
  md: "tracking-[0.06em]",
  lg: "tracking-[0.08em]",
} as const;

const headerEmblemFit =
  "h-[calc(var(--store-nav-height-mobile)-2*var(--store-emblem-clearance))] w-[calc((var(--store-nav-height-mobile)-2*var(--store-emblem-clearance))*54/68)]";

const headerEmblemFitDesktop =
  "h-[calc(4.875rem-2*var(--store-emblem-clearance))] w-[calc((4.875rem-2*var(--store-emblem-clearance))*54/68)]";

const emblemSizeMap = {
  nav: headerEmblemFit,
  sidebar: "h-[63px] w-[51px]",
  footer: "h-[60px] w-[48px]",
  sm: "h-[66px] w-[53px]",
  md: headerEmblemFitDesktop,
  lg: "h-[84px] w-[68px]",
} as const;

const emblemScaleMap = {
  nav: "scale-[1.46]",
  md: "scale-[1.42]",
} as const;

const regMarkClassMap = {
  nav: "ml-[0.1em] align-super text-[12px] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
  sidebar:
    "ml-[0.08em] align-super text-[11px] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
  footer:
    "ml-[0.08em] align-super text-[11px] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
  sm: "ml-[0.08em] align-super text-[0.48em] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
  md: "ml-[0.08em] align-super text-[0.42em] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
  lg: "ml-[0.08em] align-super text-[0.42em] font-extrabold leading-none text-[#9A7209] [text-shadow:none]",
} as const;

const emblemGapMap = {
  nav: "gap-[0.09375rem]",
  sidebar: "gap-0.5",
  footer: "gap-[0.09375rem]",
  sm: "gap-[0.09375rem]",
  md: "gap-[0.09375rem]",
  lg: "gap-[0.09375rem]",
} as const;

const textOffsetMap = {
  nav: "self-start translate-y-[4.5px] sm:translate-y-[6.5px]",
  md: "self-start translate-y-[6.5px]",
} as const;

/** Official wordmark: ST emblem + gold caps “SAKTHI TEXTILE®”. */
export function BrandWordmark({
  className,
  size = "md",
  align = "left",
}: Props) {
  return (
    <span
      className={cn(
        "wordmark inline-flex shrink-0 items-center font-[family-name:var(--font-brand-sans)]",
        emblemGapMap[size],
        sizeMap[size],
        align === "center" && "mx-auto",
        className,
      )}
      aria-label={`${siteConfig.shortName} registered trademark`}
    >
      <span
        className={cn(
          "relative shrink-0",
          (size === "nav" || size === "md") && "overflow-hidden",
          emblemSizeMap[size],
        )}
        aria-hidden
      >
        <Image
          src="/images/sakthi-st-emblem.png"
          alt=""
          fill
          sizes="(max-width: 768px) 56px, 74px"
          className={cn(
            "object-contain object-center",
            (size === "nav" || size === "md") && emblemScaleMap[size],
          )}
          priority={size === "nav" || size === "sidebar" || size === "md"}
        />
      </span>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap font-extrabold uppercase leading-none",
          (size === "nav" || size === "md") && textOffsetMap[size],
          "text-[#FFD700] [text-shadow:1px_1px_0_#8B6914,2px_2px_4px_rgba(0,0,0,0.12)]",
          trackingMap[size],
        )}
      >
        <span>Sakthi </span>
        <span>
          Textile
          <sup className={regMarkClassMap[size]} aria-hidden>
            ®
          </sup>
        </span>
      </span>
    </span>
  );
}

export default BrandWordmark;
