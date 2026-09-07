/**
 * Copy public Supabase Storage objects into Sakthi R2 via the media Worker.
 * Source: {SUPABASE}/storage/v1/object/public/media/{key}
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.DATABASE_SERVICE_ROLE;
const proxy = process.env.R2_MEDIA_PROXY_URL?.replace(/\/$/, "");
const secret = process.env.R2_MEDIA_PROXY_SECRET?.trim();
const cdn = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "");

if (!supabaseUrl || !anon || !proxy || !secret) {
  console.error("Missing SUPABASE or R2 proxy env");
  process.exit(1);
}

async function gql(query) {
  const r = await fetch(`${supabaseUrl}/graphql/v1`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

async function listStorage(prefix, offset = 0) {
  if (!service) return [];
  const r = await fetch(`${supabaseUrl}/storage/v1/object/list/media`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!r.ok) {
    console.warn("storage list", prefix, r.status);
    return [];
  }
  return r.json();
}

async function collectStorageKeys(prefix = "") {
  const keys = [];
  let offset = 0;
  for (;;) {
    const rows = await listStorage(prefix, offset);
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      const name = `${prefix}${row.name}`;
      if (row.id === null && !row.metadata) {
        keys.push(...(await collectStorageKeys(`${name}/`)));
      } else {
        keys.push(name);
      }
    }
    if (rows.length < 1000) break;
    offset += rows.length;
  }
  return keys;
}

async function collectGraphqlKeys() {
  const keys = new Set();
  let cursor = null;
  for (let page = 0; page < 50; page += 1) {
    const after = cursor ? `, after: "${cursor}"` : "";
    const json = await gql(`{
      mediasCollection(first: 100${after}) {
        pageInfo { hasNextPage endCursor }
        edges { node { key } }
      }
    }`);
    const col = json.data?.mediasCollection;
    if (!col) break;
    for (const edge of col.edges || []) {
      if (edge.node?.key) keys.add(edge.node.key);
    }
    if (!col.pageInfo?.hasNextPage) break;
    cursor = col.pageInfo.endCursor;
  }
  return [...keys];
}

async function copyKey(key) {
  const src = `${supabaseUrl}/storage/v1/object/public/media/${key}`;
  const get = await fetch(src);
  if (!get.ok) return { key, ok: false, reason: `src ${get.status}` };
  const buf = Buffer.from(await get.arrayBuffer());
  const type = get.headers.get("content-type") || "application/octet-stream";
  const put = await fetch(`${proxy}/object?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": type,
      "Content-Length": String(buf.length),
    },
    body: buf,
  });
  if (!put.ok) {
    const text = await put.text().catch(() => "");
    return { key, ok: false, reason: `r2 ${put.status} ${text.slice(0, 80)}` };
  }
  return { key, ok: true, bytes: buf.length };
}

const gqlKeys = await collectGraphqlKeys();
const storageKeys = await collectStorageKeys();
const keys = [...new Set([...gqlKeys, ...storageKeys])].filter(Boolean);
console.log("keys graphql", gqlKeys.length, "storage", storageKeys.length, "unique", keys.length);

let ok = 0;
let fail = 0;
for (const key of keys) {
  const result = await copyKey(key);
  if (result.ok) {
    ok += 1;
    if (ok <= 3 || ok % 25 === 0) console.log("OK", ok, key, result.bytes);
  } else {
    fail += 1;
    console.warn("FAIL", key, result.reason);
  }
}

if (cdn && ok) {
  const sample = keys[0];
  const check = await fetch(`${cdn}/${sample}`, { method: "HEAD" });
  console.log("cdn_check", check.status, sample);
}

console.log("done ok", ok, "fail", fail);
