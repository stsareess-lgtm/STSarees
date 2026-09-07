/**
 * Smoke-check Cloudflare CDN resize vs raw R2.
 *
 * Usage:
 *   node scripts/validate-image-delivery.mjs
 *   node scripts/validate-image-delivery.mjs sakthi/upload-yMQI_X4Up0VTMyFXk9ZU7.webp
 */
const CDN =
  process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "") ||
  "https://pub-351c586a832c41d6816471c888ca13c4.r2.dev";
const MEDIA =
  process.env.NEXT_PUBLIC_MEDIA_CDN_ORIGIN?.replace(/\/$/, "") ||
  "https://sakthi-textile-media-proxy.stsareess.workers.dev";

const key =
  process.argv[2]?.trim() || "sakthi/upload-yMQI_X4Up0VTMyFXk9ZU7.webp";

async function head(url) {
  const res = await fetch(url, { method: "GET" });
  const buf = res.ok ? await res.arrayBuffer() : null;
  return {
    url,
    status: res.status,
    bytes: buf ? buf.byteLength : Number(res.headers.get("content-length") || 0),
    type: res.headers.get("content-type"),
  };
}

const raw = await head(`${CDN}/${key}`);
const resized = await head(`${MEDIA}/cdn/w=400,q=75,f=webp/${key}`);
const health = await fetch(`${MEDIA}/health`).then((r) => r.json());

console.log(JSON.stringify({ health, raw, resized }, null, 2));

if (raw.status !== 200) {
  console.error("FAIL: raw R2 object missing");
  process.exit(1);
}
if (resized.status !== 200) {
  console.error("FAIL: CF resize URL did not return 200 — deploy media-proxy?");
  process.exit(1);
}
if (!String(resized.type || "").includes("image/")) {
  console.error("FAIL: resized Content-Type is not an image");
  process.exit(1);
}
if (resized.bytes <= 0 || resized.bytes >= raw.bytes) {
  console.error(
    `FAIL: expected resized (${resized.bytes}) << raw (${raw.bytes})`,
  );
  process.exit(1);
}
if (resized.bytes > 120_000) {
  console.error(`WARN: resized still large (${resized.bytes} bytes)`);
}

console.log(
  `OK: ${raw.bytes} -> ${resized.bytes} bytes (${Math.round((1 - resized.bytes / raw.bytes) * 100)}% smaller)`,
);
