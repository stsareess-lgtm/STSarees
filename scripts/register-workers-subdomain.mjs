import fs from "node:fs";
import path from "node:path";

const ACCOUNT_ID = "fb04e106c31247ba90f537dc0d5f9b62";
const TOML = path.join(
  process.env.APPDATA || "",
  "xdg.config/.wrangler/config/default.toml",
);
const text = fs.readFileSync(TOML, "utf8");
const token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("missing oauth token");

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/subdomain`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subdomain: "stsareess" }),
  },
);
const json = await res.json();
console.log(
  JSON.stringify(
    {
      status: res.status,
      success: json.success,
      result: json.result,
      errors: json.errors,
    },
    null,
    2,
  ),
);
