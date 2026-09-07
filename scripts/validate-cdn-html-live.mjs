const origin = "https://www.sakthitextile.com";
const vercel = "https://st-sarees.vercel.app";

async function check(label, base, path) {
  const res = await fetch(`${base}${path}?cdncheck=${Date.now()}`, {
    headers: { "cache-control": "no-cache" },
  });
  const html = await res.text();
  const cdnRefs = (html.match(/\/cdn\/w=\d+/g) || []).length;
  const hasProxy = html.includes(
    "sakthi-textile-media-proxy.stsareess.workers.dev/cdn/",
  );
  console.log(
    `${label} ${path} status=${res.status} cache=${res.headers.get("x-sakthi-cache")} hasCdn=${hasProxy} refs=${cdnRefs}`,
  );
  return { hasProxy, cdnRefs, html };
}

const home = await check("www", origin, "/");
const shop = await check("www", origin, "/shop");
const originShop = await check("vercel", vercel, "/shop");

const slugMatch = shop.html.match(/href=["']\/shop\/([^"'?#]+)/);
if (slugMatch) {
  const pdp = await check("www", origin, `/shop/${slugMatch[1]}`);
  console.log("pdp slug", slugMatch[1], "cdn", pdp.hasProxy);
}

const ok =
  home.hasProxy ||
  shop.hasProxy ||
  originShop.hasProxy ||
  home.cdnRefs > 0 ||
  shop.cdnRefs > 0 ||
  originShop.cdnRefs > 0;

if (!ok) {
  console.error("FAIL: no /cdn URLs found in HTML (edge may still be stale)");
  process.exit(1);
}
console.log("OK: Cloudflare /cdn URLs present in storefront HTML");
