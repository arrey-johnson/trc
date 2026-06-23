#!/usr/bin/env node
/**
 * Reliable dev startup:
 * - stops stale Next.js processes
 * - wipes .next (prevents CSS/chunk 404s after npm run build)
 * - starts next dev with Turbopack (more stable than webpack in dev)
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

execSync("node scripts/kill-next.mjs", { cwd: root, stdio: "inherit" });

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
