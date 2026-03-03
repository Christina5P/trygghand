import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const absolute = path.resolve(file);
  if (fs.existsSync(absolute)) {
    dotenv.config({ path: absolute, override: false });
  }
}

const vapidPublicKey = process.env.VITE_PUSH_VAPID_PUBLIC_KEY;

if (!vapidPublicKey || !String(vapidPublicKey).trim()) {
  console.error(
    "[dev:push] Saknar VITE_PUSH_VAPID_PUBLIC_KEY. Lägg den i .env.local eller sätt den i shell innan start."
  );
  process.exit(1);
}

const child = spawn("node", ["scripts/dev.mjs"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") {
    process.exit(code);
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(0);
});
