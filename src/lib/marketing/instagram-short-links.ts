/**
 * Short, typeable Instagram campaign links: sakthitextile.com/ig/<code>.
 *
 * First automated DM should not include a raw URL — ask the user to reply,
 * then send one of these short links.
 */
export const INSTAGRAM_SHORT_LINKS: Readonly<Record<string, string>> = {
  silk: "/collections/silk-cotton-sarees",
  korvai: "/collections/korvai-border-silk-cotton-sarees",
  soft: "/collections/premium-soft-silk-saree",
  kerala: "/collections/kerala-saree-meena-work",
  bridal: "/collections/nikki-galrani-inspired-silk-sarees-bridal-collections",
  celebrity: "/collections/celebrity-inspired-saree",
  blouse: "/collections/silk-cotton-blouse",
  dhoti: "/collections/dhoti-and-shirts",
  shop: "/shop",
  home: "/",
};

const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/;

export const INSTAGRAM_UTM = {
  utm_source: "instagram",
  utm_medium: "dm",
} as const;

/** Normalised code, or null when it is not a safe slug. */
export function normalizeInstagramShortCode(rawCode: string): string | null {
  const code = rawCode.trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Absolute redirect URL (with UTM tags) for a short code. */
export function buildInstagramShortLinkTarget(
  rawCode: string,
  origin: string,
): URL {
  const code = normalizeInstagramShortCode(rawCode);
  const path = code
    ? INSTAGRAM_SHORT_LINKS[code] ?? `/collections/${code}`
    : "/shop";

  const target = new URL(path, origin);
  target.searchParams.set("utm_source", INSTAGRAM_UTM.utm_source);
  target.searchParams.set("utm_medium", INSTAGRAM_UTM.utm_medium);
  target.searchParams.set("utm_campaign", code ?? "unknown");
  return target;
}
