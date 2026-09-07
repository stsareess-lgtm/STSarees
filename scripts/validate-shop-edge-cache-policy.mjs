/**
 * Pure helpers mirrored for offline validation of edge-cache policy.
 * Keep in sync with workers/sakthi-shop-edge/src/index.ts rules.
 */
const PRIVATE_PREFIXES = [
  "/cart",
  "/orders",
  "/wish-list",
  "/setting",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/admin",
  "/api/admin",
  "/api/cart",
  "/api/checkout",
  "/api/create-checkout-session",
  "/api/orders",
  "/api/cashfree",
  "/api/phonepe",
  "/api/webhook",
  "/api/cron",
  "/api/velo",
  "/api/users",
];

function hasSupabaseAuthCookie(cookieHeader) {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)sb-[^=;\s]+-auth-token=/.test(cookieHeader);
}

function isPrivatePath(pathname) {
  const path = pathname.toLowerCase();
  return PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

function isPublicHtmlPath(pathname) {
  const path = pathname.toLowerCase();
  if (path === "/" || path === "") return true;
  if (path === "/shop" || path.startsWith("/shop/")) return true;
  if (path === "/collections" || path.startsWith("/collections/")) return true;
  if (path === "/featured") return true;
  if (path.startsWith("/ig/")) return true;
  return [
    "/about",
    "/contact",
    "/faq",
    "/shipping-returns",
    "/privacy-policy",
    "/payment-methods",
    "/store-policy",
    "/terms-and-conditions",
    "/terms-of-use",
  ].includes(path);
}

function isPublicStorefrontApi(pathname) {
  const path = pathname.toLowerCase();
  return (
    path === "/api/products/size-config" ||
    path === "/api/storefront/products" ||
    path === "/api/storefront/products/suggest" ||
    path === "/api/storefront/collections" ||
    path === "/api/storefront/pack-labels" ||
    path === "/api/geo/pincode"
  );
}

function isCacheableGet({ method, pathname, cookie, authorization }) {
  if (method !== "GET" && method !== "HEAD") return false;
  if (authorization) return false;
  if (hasSupabaseAuthCookie(cookie || null)) return false;
  if (isPrivatePath(pathname)) return false;
  return isPublicHtmlPath(pathname) || isPublicStorefrontApi(pathname);
}

const cases = [
  { name: "home GET", method: "GET", pathname: "/", expect: true },
  { name: "shop GET", method: "GET", pathname: "/shop", expect: true },
  {
    name: "product GET",
    method: "GET",
    pathname: "/shop/silk-saree",
    expect: true,
  },
  {
    name: "collections GET",
    method: "GET",
    pathname: "/collections/silk-cotton-sarees",
    expect: true,
  },
  { name: "ig short link", method: "GET", pathname: "/ig/silk", expect: true },
  {
    name: "storefront products API",
    method: "GET",
    pathname: "/api/storefront/products",
    expect: true,
  },
  {
    name: "size-config API",
    method: "GET",
    pathname: "/api/products/size-config",
    expect: true,
  },
  { name: "cart GET", method: "GET", pathname: "/cart", expect: false },
  { name: "admin GET", method: "GET", pathname: "/admin", expect: false },
  {
    name: "admin API",
    method: "GET",
    pathname: "/api/admin/products/manage",
    expect: false,
  },
  {
    name: "auth cookie bypass",
    method: "GET",
    pathname: "/",
    cookie: "sb-qhtwwyqlsnckorndmhmt-auth-token=x",
    expect: false,
  },
  {
    name: "authorization bypass",
    method: "GET",
    pathname: "/shop",
    authorization: "Bearer x",
    expect: false,
  },
  { name: "POST home", method: "POST", pathname: "/", expect: false },
  {
    name: "checkout session API",
    method: "GET",
    pathname: "/api/create-checkout-session",
    expect: false,
  },
];

let failed = 0;
for (const c of cases) {
  const got = isCacheableGet(c);
  const ok = got === c.expect;
  if (!ok) {
    failed += 1;
    console.error("FAIL", c.name, "expected", c.expect, "got", got);
  } else {
    console.log("OK", c.name);
  }
}

if (failed > 0) {
  console.error(`\n${failed} policy case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} edge-cache policy cases passed`);
