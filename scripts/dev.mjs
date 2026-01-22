import { spawn } from "node:child_process";
import path from "node:path";

function spawnChild(command, args, name) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("spawn", () => {
    // eslint-disable-next-line no-console
    console.log(`[dev] started ${name} (pid ${child.pid})`);
  });

  return child;
}

function killChild(child, signal = "SIGTERM") {
  if (!child || child.killed) return;
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
}

const backend = spawnChild("node", ["backend/server.js"], "backend");

const viteBin = path.resolve("node_modules", "vite", "bin", "vite.js");
const viteArgs = [
  viteBin,
  "--host",
  "0.0.0.0",
  "--port",
  "5173",
  "--strictPort",
];
const vite = spawnChild("node", viteArgs, "vite");

let isShuttingDown = false;
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  killChild(vite, "SIGTERM");
  killChild(backend, "SIGTERM");

  const hardKillTimer = setTimeout(() => {
    killChild(vite, "SIGKILL");
    killChild(backend, "SIGKILL");
  }, 2000);
  hardKillTimer.unref();

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

backend.on("exit", (code, signal) => {
  if (isShuttingDown) return;
  // eslint-disable-next-line no-console
  console.log(`[dev] backend exited (${signal ?? code ?? 0}); stopping vite...`);
  shutdown(code ?? 0);
});

vite.on("exit", (code, signal) => {
  if (isShuttingDown) return;
  // eslint-disable-next-line no-console
  console.log(`[dev] vite exited (${signal ?? code ?? 0}); stopping backend...`);
  shutdown(code ?? 0);
});
