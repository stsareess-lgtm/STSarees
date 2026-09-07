/**
 * One-off setup: enable R2, create bucket, public URL, list zones.
 * Does not print secrets. Writes public results to stdout.
 */
import fs from "node:fs";
import path from "node:path";

const ACCOUNT_ID = "fb04e106c31247ba90f537dc0d5f9b62";
const BUCKET = "sakthi-textile-media";
const TOML = path.join(
  process.env.APPDATA || "",
  "xdg.config/.wrangler/config/default.toml",
);

function readOauthToken() {
  const text = fs.readFileSync(TOML, "utf8");
  const match = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("Wrangler oauth token not found");
  return match[1];
}

async function cf(token, method, apiPath, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

function summarizeErrors(json) {
  return (json.errors || [])
    .map((e) => `${e.code}: ${e.message}`)
    .join("; ");
}

const token = readOauthToken();
const out = {};

out.zones = await cf(
  token,
  "GET",
  `/zones?account.id=${ACCOUNT_ID}&per_page=50`,
);
out.subscriptionPut = await cf(
  token,
  "PUT",
  `/accounts/${ACCOUNT_ID}/r2/subscription`,
  {},
);
out.subscriptionGet = await cf(
  token,
  "GET",
  `/accounts/${ACCOUNT_ID}/r2/subscription`,
);
out.createBucket = await cf(token, "POST", `/accounts/${ACCOUNT_ID}/r2/buckets`, {
  name: BUCKET,
});
out.listBuckets = await cf(token, "GET", `/accounts/${ACCOUNT_ID}/r2/buckets`);
out.enableDevUrl = await cf(
  token,
  "PUT",
  `/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/domains/managed`,
  { enabled: true },
);
out.managedDomain = await cf(
  token,
  "GET",
  `/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/domains/managed`,
);
out.createToken = await cf(token, "POST", `/accounts/${ACCOUNT_ID}/r2/tokens`, {
  name: "sakthi-textile-app",
  permission: "object-read-write",
  ttlDays: 365,
});

const zones = out.zones.json.result || [];
console.log(
  JSON.stringify(
    {
      zones: zones.map((z) => ({
        name: z.name,
        status: z.status,
        id: z.id,
      })),
      subscriptionPut: {
        status: out.subscriptionPut.status,
        success: out.subscriptionPut.json.success,
        errors: summarizeErrors(out.subscriptionPut.json),
      },
      subscriptionGet: {
        status: out.subscriptionGet.status,
        success: out.subscriptionGet.json.success,
        result: out.subscriptionGet.json.result || null,
        errors: summarizeErrors(out.subscriptionGet.json),
      },
      createBucket: {
        status: out.createBucket.status,
        success: out.createBucket.json.success,
        errors: summarizeErrors(out.createBucket.json),
      },
      buckets: (out.listBuckets.json.result?.buckets || []).map((b) => b.name),
      listBucketsErrors: summarizeErrors(out.listBuckets.json),
      enableDevUrl: {
        status: out.enableDevUrl.status,
        success: out.enableDevUrl.json.success,
        errors: summarizeErrors(out.enableDevUrl.json),
      },
      managedDomain: out.managedDomain.json.result || null,
      createToken: {
        status: out.createToken.status,
        success: out.createToken.json.success,
        errors: summarizeErrors(out.createToken.json),
        hasAccessKey: Boolean(
          out.createToken.json.result?.accessKeyId ||
            out.createToken.json.result?.accessKeyID,
        ),
      },
    },
    null,
    2,
  ),
);

if (out.createToken.json.success && out.createToken.json.result) {
  const secretPath = path.join(process.cwd(), ".env.r2.generated.local");
  const result = out.createToken.json.result;
  fs.writeFileSync(
    secretPath,
    [
      `NEXT_PUBLIC_S3_BUCKET=${BUCKET}`,
      `NEXT_PUBLIC_S3_REGION=auto`,
      `S3_ENDPOINT=https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      `S3_ACCESS_KEY_ID=${result.accessKeyId || result.accessKeyID || ""}`,
      `S3_SECRET_ACCESS_KEY=${result.secretAccessKey || result.secret || ""}`,
    ].join("\n") + "\n",
    { encoding: "utf8" },
  );
  console.log("WROTE_R2_KEYS_FILE");
}
