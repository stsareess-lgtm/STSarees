import { buildInstagramShortLinkTarget } from "@/lib/marketing/instagram-short-links";
import { getCanonicalSiteOrigin } from "@/lib/auth/site-urls";
import { NextRequest, NextResponse } from "next/server";

/** sakthitextile.com/ig/<code> → collection/shop page tagged with Instagram UTMs. */
export async function GET(
  _request: NextRequest,
  context: { params: { code: string } },
) {
  const target = buildInstagramShortLinkTarget(
    context.params.code,
    getCanonicalSiteOrigin(),
  );
  return NextResponse.redirect(target, 308);
}
