import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/ST Sarees");
const envText = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const secret = envText
  .split(/\r?\n/)
  .find((line) => line.startsWith("R2_MEDIA_PROXY_SECRET="))
  ?.slice("R2_MEDIA_PROXY_SECRET=".length)
  ?.trim();
if (!secret) throw new Error("R2_MEDIA_PROXY_SECRET missing from .env.local");

const child = spawn(
  "npx",
  ["wrangler", "secret", "put", "MEDIA_PROXY_SECRET"],
  {
    cwd: path.join(root, "workers/r2-media-proxy"),
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  },
);
child.stdin.write(`${secret}\n`);
child.stdin.end();
child.on("exit", (code) => process.exit(code ?? 1));
