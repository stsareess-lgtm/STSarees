/**
 * Live smoke checks for Sakthi THRY-parity optimizations.
 * Usage: node scripts/validate-thry-optimizations-live.mjs
 */
const ORIGIN = "https://www.sakthitextile.com";
const PROXY =
  "https://sakthi-textile-media-proxy.stsareess.workers.dev";

const checks = [];

async function req(path, opts = {}) {
  return fetch(ORIGIN + path, {
    redirect: "manual",
    headers: {
      "user-agent": "SakthiValidate/1.0",
      ...(opts.headers || {}),
    },
  });
}

function push(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: String(detail ?? "") });
}

const h1 = await req("/");
const c1 = h1.headers.get("x-sakthi-cache");
const h2 = await req("/");
const c2 = h2.headers.get("x-sakthi-cache");
push(
  "home cache MISS|HIT then HIT",
  h1.status === 200 &&
    h2.status === 200 &&
    ["HIT", "MISS"].includes(c1) &&
    c2 === "HIT",
  `${c1}->${c2}`,
);

const cart = await req("/cart");
const admin = await req("/admin");
push(
  "cart BYPASS",
  cart.headers.get("x-sakthi-cache") === "BYPASS",
  cart.headers.get("x-sakthi-cache"),
);
push(
  "admin BYPASS",
  admin.headers.get("x-sakthi-cache") === "BYPASS",
  admin.headers.get("x-sakthi-cache"),
);

const ig = await req("/ig/silk");
const loc = ig.headers.get("location") || "";
push(
  "/ig/silk redirect+UTM",
  [301, 302, 307, 308].includes(ig.status) &&
    loc.includes("/collections/") &&
    loc.includes("utm_source=instagram") &&
    loc.includes("utm_campaign=silk"),
  `${ig.status} ${loc}`,
);

const homeHtml = await (await fetch(ORIGIN + "/")).text();
push(
  "home hero preload link",
  /rel=["']preload["']/i.test(homeHtml),
  /rel=["']preload["']/i.test(homeHtml) ? "found" : "missing",
);

const shop = await (await fetch(ORIGIN + "/shop")).text();
const slugMatch = shop.match(/href=["']\/shop\/([^"'?#]+)["']/);
if (slugMatch) {
  const pdp = await (
    await fetch(ORIGIN + "/shop/" + slugMatch[1], {
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    })
  ).text();
  push(
    "PDP has #product-buy-box",
    pdp.includes("product-buy-box") || pdp.includes('id="product-buy-box"'),
    `slug=${slugMatch[1]}; buyBox=${pdp.includes("product-buy-box")}`,
  );
} else {
  push("PDP has #product-buy-box", false, "no product slug on /shop");
}

const health = await fetch(PROXY + "/health");
const healthText = await health.text();
push(
  "media-proxy /health",
  health.status === 200,
  `${health.status} ${healthText.slice(0, 80)}`,
);

const imgKey = (homeHtml.match(/(?:sakthi\/|uploads\/)[a-zA-Z0-9/_.\-]+/) ||
  [])[0];
if (imgKey) {
  const cdn = await fetch(`${PROXY}/cdn/w=200,q=70,f=webp/${imgKey}`);
  push(
    "media-proxy /cdn resize",
    cdn.status === 200 &&
      String(cdn.headers.get("content-type") || "").startsWith("image/"),
    `${cdn.status} ${cdn.headers.get("content-type")} key=${imgKey}`,
  );
} else {
  push("media-proxy /cdn resize", false, "no key found in home HTML");
}

for (const c of checks) {
  console.log(`${c.ok ? "OK" : "FAIL"} ${c.name} — ${c.detail}`);
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
