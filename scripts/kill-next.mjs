#!/usr/bin/env node
/** Kill stale Next.js dev/production servers that corrupt .next when mixed with builds. */
import { execSync } from "node:child_process";

function run(cmd) {
  try {
    execSync(cmd, { stdio: "ignore", shell: true });
  } catch {
    // Process was not running
  }
}

for (const port of [3000, 3001, 3002]) {
  run(`lsof -ti:${port} 2>/dev/null | xargs kill -9 2>/dev/null`);
}

run('pkill -f "next dev" 2>/dev/null');
run('pkill -f "next start" 2>/dev/null');
