import { getListeningPids, describePid, killPid } from "./ports.mjs";

const ports = [5173, 3001];

const pidsToKill = new Set();
for (const port of ports) {
  const { pids } = getListeningPids(port);
  for (const pid of pids) pidsToKill.add(pid);
}

if (pidsToKill.size === 0) {
  // eslint-disable-next-line no-console
  console.log("[dev:kill] No listeners found on 5173/3001.");
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log("[dev:kill] Killing processes listening on 5173/3001:");
for (const pid of pidsToKill) {
  // eslint-disable-next-line no-console
  console.log(`- ${describePid(pid)}`);
}

for (const pid of pidsToKill) {
  try {
    killPid(pid, "SIGTERM");
  } catch {
    // ignore
  }
}

// Give them a moment to exit
await new Promise((r) => setTimeout(r, 500));

// Hard kill anything still listening
for (const port of ports) {
  const { pids } = getListeningPids(port);
  for (const pid of pids) {
    try {
      killPid(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}

// eslint-disable-next-line no-console
console.log("[dev:kill] Done.");
