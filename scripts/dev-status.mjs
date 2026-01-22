import { getListeningPids, describePid } from "./ports.mjs";

const ports = [5173, 3001];

for (const port of ports) {
  const { pids, raw } = getListeningPids(port);
  // eslint-disable-next-line no-console
  console.log(`\n[dev:status] Port ${port}`);

  if (!raw) {
    // eslint-disable-next-line no-console
    console.log("  (no listeners)");
    continue;
  }

  // eslint-disable-next-line no-console
  console.log(raw.split("\n").map((l) => `  ${l}`).join("\n"));

  if (pids.length) {
    // eslint-disable-next-line no-console
    console.log("  PIDs:");
    for (const pid of pids) {
      // eslint-disable-next-line no-console
      console.log(`  - ${describePid(pid)}`);
    }
  }
}
