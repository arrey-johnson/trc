#!/usr/bin/env node
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Add these to .env.local (and Vercel project settings):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com`);
console.log(`CRON_SECRET=${crypto.randomUUID()}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-dashboard`);
