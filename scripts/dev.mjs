#!/usr/bin/env node
/**
 * Reliable dev startup:
 * - stops stale Next.js processes on ports 3000–3002
 * - wipes .next (prevents CSS/chunk 404s after npm run build)
 * - starts next dev with a fresh cache
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
}

for (const port of [3000, 3001, 3002]) {
  try {
    execSync(`lsof -ti:${port} 2>/dev/null | xargs kill -9 2>/dev/null`, {
      cwd: root,
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // Port was free
  }
}

const nextDir = path.join(root, ".next");
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Cleared .next cache");
}

console.log("Starting dev server on http://localhost:3000\n");

const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
