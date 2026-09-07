#!/usr/bin/env node
/**
 * Bootstrap an empty Supabase project for Sakthi Textile.
 *
 * Usage (after filling .env.local with the NEW project):
 *   node --env-file=.env.local scripts/bootstrap-new-supabase.mjs
 *
 * Applies schema SQL in a safe order, then prints Auth URL checklist.
 * Does not migrate old shop data (empty project assumed).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sqlDir = path.join(root, "supabase");

const ORDER = [
  "01-schema-and-seed.sql",
  "02-enable-graphql.sql",
  "02-make-admin.sql",
  "03-sakthi-collections.sql",
  "04-testimonials.sql",
  "05-testimonials-video.sql",
  "05-user-addresses.sql",
  "06-payment-integrations.sql",
  "07-seller-whatsapp-notify.sql",
  "08-products-draft-code.sql",
  "09-product-discount.sql",
  "09-velo-api-keys.sql",
  "10-admin-products-performance.sql",
  "10-product-lifecycle-cleanup.sql",
  "11-collections-featured-image-nullable.sql",
];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL. Put the new Supabase pooler URI in .env.local.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function applyFile(fileName) {
  const full = path.join(sqlDir, fileName);
  if (!fs.existsSync(full)) {
    console.warn(`SKIP (missing): ${fileName}`);
    return;
  }
  const body = fs.readFileSync(full, "utf8");
  console.log(`APPLY ${fileName}…`);
  try {
    await sql.unsafe(body);
    console.log(`  OK ${fileName}`);
  } catch (error) {
    console.error(`  FAIL ${fileName}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function main() {
  console.log("Bootstrapping empty Supabase for Sakthi Textile…");
  for (const file of ORDER) {
    // eslint-disable-next-line no-await-in-loop
    await applyFile(file);
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  console.log("\nDone. Next in Supabase Dashboard → Authentication → URL Configuration:");
  console.log(`  Site URL: ${site || "(set NEXT_PUBLIC_SITE_URL)"}`);
  if (site) {
    console.log("  Redirect URLs:");
    console.log(`    ${site}/auth/callback`);
    console.log(`    ${site}/**`);
    console.log("    http://localhost:3000/auth/callback");
  }
  console.log("\nMedia: uploads use Supabase Storage until you add R2 envs.");
  console.log("Then set S3_ENDPOINT, NEXT_PUBLIC_CDN_URL, and real R2 keys.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
