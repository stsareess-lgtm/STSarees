import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ACCOUNT_ID = "fb04e106c31247ba90f537dc0d5f9b62";
const BUCKET = "sakthi-textile-media";
const CDN = "https://pub-351c586a832c41d6816471c888ca13c4.r2.dev";
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const TOML = path.join(
  process.env.APPDATA || "",
  "xdg.config/.wrangler/config/default.toml",
);
const ENV_PATH = path.join(process.cwd(), ".env.local");
const SECRET_FILE = path.join(process.cwd(), ".env.r2.generated.local");

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
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

function upsertEnv(contents, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(contents)) return contents.replace(re, line);
  return `${contents.replace(/\s*$/, "")}\n${line}\n`;
}

const token = readOauthToken();
const proxySecret = crypto.randomBytes(32).toString("hex");

const cors = await cf(
  token,
  "PUT",
  `/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/cors`,
  {
    rules: [
      {
        allowed: {
          origins: [
            "https://www.sakthitextile.com",
            "https://sakthitextile.com",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
          ],
          methods: ["GET", "PUT", "HEAD", "POST"],
          headers: ["*"],
        },
        exposeHeaders: ["ETag", "Content-Type"],
        maxAgeSeconds: 86400,
      },
    ],
  },
);

const groups = await cf(token, "GET", "/user/tokens/permission_groups");
const r2Groups = (groups.json.result || []).filter((g) =>
  /r2|workers r2/i.test(`${g.name} ${JSON.stringify(g.meta || {})}`),
);

const tokenTries = [];
for (const p of [
  `/accounts/${ACCOUNT_ID}/r2/tokens`,
  `/accounts/${ACCOUNT_ID}/storage/r2/tokens`,
  `/accounts/${ACCOUNT_ID}/r2/access-keys`,
]) {
  const r = await cf(token, "POST", p, {
    name: "sakthi-textile-app",
    permission: "object-read-write",
    policies: [
      {
        effect: "allow",
        permission: "object-read-write",
        resources: { [`com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_${BUCKET}`]: "*" },
      },
    ],
  });
  tokenTries.push({
    path: p,
    status: r.status,
    success: r.json.success,
    errors: (r.json.errors || []).map((e) => e.message).join("; "),
    hasKey: Boolean(r.json.result?.accessKeyId || r.json.result?.accessKeyID),
  });
  if (r.json.success && r.json.result) {
    const result = r.json.result;
    fs.writeFileSync(
      SECRET_FILE,
      [
        `S3_ACCESS_KEY_ID=${result.accessKeyId || result.accessKeyID || ""}`,
        `S3_SECRET_ACCESS_KEY=${result.secretAccessKey || result.secret || ""}`,
      ].join("\n") + "\n",
    );
  }
}

let envText = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
envText = upsertEnv(envText, "NEXT_PUBLIC_S3_BUCKET", BUCKET);
envText = upsertEnv(envText, "NEXT_PUBLIC_S3_REGION", "auto");
envText = upsertEnv(envText, "S3_ENDPOINT", ENDPOINT);
envText = upsertEnv(envText, "NEXT_PUBLIC_CDN_URL", CDN);
envText = upsertEnv(envText, "R2_MEDIA_PROXY_SECRET", proxySecret);
fs.writeFileSync(ENV_PATH, envText.endsWith("\n") ? envText : `${envText}\n`);
fs.writeFileSync(
  path.join(process.cwd(), "workers/r2-media-proxy/.dev.vars"),
  `MEDIA_PROXY_SECRET=${proxySecret}\n`,
);

console.log(
  JSON.stringify(
    {
      cors: { status: cors.status, success: cors.json.success },
      r2GroupNames: r2Groups.map((g) => ({ id: g.id, name: g.name })),
      tokenTries,
      wroteEnvKeys: [
        "NEXT_PUBLIC_S3_BUCKET",
        "NEXT_PUBLIC_S3_REGION",
        "S3_ENDPOINT",
        "NEXT_PUBLIC_CDN_URL",
        "R2_MEDIA_PROXY_SECRET",
      ],
      cdn: CDN,
      endpoint: ENDPOINT,
      bucket: BUCKET,
    },
    null,
    2,
  ),
);
