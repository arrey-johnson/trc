#!/usr/bin/env node
/**
 * Verifies push notification env vars for local or CI checks.
 * Usage: node scripts/verify-push-config.mjs
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "CRON_SECRET",
];

const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length) {
  console.error("Missing required environment variables:\n");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error("\nRun: npm run generate-vapid");
  console.error("Then add SUPABASE_SERVICE_ROLE_KEY from Supabase → Settings → API.");
  process.exit(1);
}

if (!process.env.VAPID_SUBJECT.startsWith("mailto:") &&
    !process.env.VAPID_SUBJECT.startsWith("https://")) {
  console.error("VAPID_SUBJECT must start with mailto: or https://");
  process.exit(1);
}

console.log("Push notification environment looks ready.");
console.log("Production checklist:");
console.log("  1. Add the same vars to Vercel project settings");
console.log("  2. Deploy so vercel.json cron is active");
console.log("  3. Test: curl -H \"Authorization: Bearer $CRON_SECRET\" https://YOUR_APP/api/cron/reminders");
console.log("  4. On phones: Add to Home Screen → Settings → Enable notifications");
