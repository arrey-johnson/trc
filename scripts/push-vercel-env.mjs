#!/usr/bin/env node
/**
 * Push VAPID + cron env vars from .env.local to Vercel (production, preview, development).
 * Prereq: npx vercel login && npx vercel link
 *
 * Usage: npm run push-vercel-env
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE = resolve(process.cwd(), ".env.local");
const KEYS = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "CRON_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function parseEnvFile(path) {
  const vars = {};
  if (!existsSync(path)) return vars;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function addEnv(key, value, target) {
  console.log(`Setting ${key} (${target})...`);
  execSync(
    `npx vercel env add ${key} ${target} --force`,
    {
      input: `${value}\n`,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    }
  );
}

const vars = parseEnvFile(ENV_FILE);
const missing = KEYS.filter((key) => !vars[key]?.trim());

if (missing.length) {
  console.error("Missing in .env.local:\n");
  for (const key of missing) console.error(`  - ${key}`);
  console.error("\nRun: npm run generate-vapid");
  process.exit(1);
}

const targets = ["production", "preview", "development"];

for (const target of targets) {
  for (const key of KEYS) {
    addEnv(key, vars[key], target);
  }
}

console.log("\nDone. Redeploy production for changes to take effect:");
console.log("  npx vercel --prod");
