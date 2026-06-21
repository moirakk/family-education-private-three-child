#!/usr/bin/env node

import { randomBytes } from "node:crypto";

function randomToken(byteLength = 24) {
  return randomBytes(byteLength).toString("hex");
}

function randomAccessCode(label) {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `FAMILY-${label}-${suffix}`;
}

const parentCode = randomAccessCode("PARENT");
const caregiverCode = randomAccessCode("CARE");
const tutorCode = randomAccessCode("TUTOR");
const viewerCode = randomAccessCode("VIEW");
const calendarToken = randomToken(24);

console.log("Private access codes for .env.local / Vercel:");
console.log("");
console.log(`PRIVATE_PARENT_ACCESS_CODE="${parentCode}"`);
console.log(`PRIVATE_CAREGIVER_ACCESS_CODE="${caregiverCode}"`);
console.log(`PRIVATE_TUTOR_ACCESS_CODE="${tutorCode}"`);
console.log(`PRIVATE_VIEWER_ACCESS_CODE="${viewerCode}"`);
console.log("");
console.log("Calendar token rotation SQL for Supabase:");
console.log("");
console.log("update public.family_settings");
console.log(`set calendar_token = '${calendarToken}'`);
console.log("where family_id = '11111111-1111-1111-1111-111111111111';");
console.log("");
console.log("iOS webcal URL shape:");
console.log("webcal://<your-domain>/api/calendar/ios?token=" + calendarToken);
console.log("");
console.log("Keep these values private. Rotate the calendar token if an iOS subscription URL is leaked.");
