import { execFileSync } from "node:child_process";

function runSs(port) {
  // -H: no header, -n: don't resolve service names, -t: TCP, -l: listening, -p: process info
  // filter expression keeps output small and fast
  return execFileSync(
    "ss",
    ["-H", "-ltnp", `sport = :${port}`],
    { encoding: "utf8" }
  );
}

export function getListeningPids(port) {
  let output = "";
  try {
    output = runSs(port);
  } catch {
    // ss returns non-zero when no sockets match; treat as empty
    output = "";
  }

  const pids = new Set();
  const pidRegex = /pid=(\d+)/g;
  for (const match of output.matchAll(pidRegex)) {
    pids.add(Number(match[1]));
  }

  return { pids: [...pids], raw: output.trim() };
}

export function describePid(pid) {
  try {
    const cmdline = execFileSync("ps", ["-p", String(pid), "-o", "pid=,ppid=,etime=,cmd="], {
      encoding: "utf8",
    }).trim();
    return cmdline || String(pid);
  } catch {
    return String(pid);
  }
}

export function killPid(pid, signal = "SIGTERM") {
  process.kill(pid, signal);
}
