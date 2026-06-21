#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const requiredEnv = [
  "NEXT_PUBLIC_FAMILY_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_PRIVATE_FAMILY_ID",
  "PRIVATE_PARENT_ACCESS_CODE",
  "SUPABASE_LEARNING_MATERIALS_BUCKET"
];

const optionalEnv = [
  "PRIVATE_CAREGIVER_ACCESS_CODE",
  "PRIVATE_TUTOR_ACCESS_CODE",
  "PRIVATE_VIEWER_ACCESS_CODE"
];

const placeholderPatterns = [
  /^$/,
  /your-/i,
  /choose-/i,
  /server-only-service-role-key/i
];

function parseEnvFile(content) {
  const values = new Map();

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, "");
    values.set(key, value);
  });

  return values;
}

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function formatStatus(ok) {
  return ok ? "ok" : "missing";
}

async function main() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const envPath = ".env.local";
  const hasEnvFile = existsSync(envPath);
  const envValues = hasEnvFile ? parseEnvFile(await readFile(envPath, "utf8")) : new Map();
  const issues = [];

  console.log("Private deployment environment check");
  console.log("");
  console.log(`Node: ${process.version} ${nodeMajor === 22 ? "ok" : "expected 22.x"}`);
  if (nodeMajor !== 22) issues.push("Use Node 22 before local production build or Vercel parity testing.");

  console.log(`.env.local: ${hasEnvFile ? "found" : "missing"}`);
  if (!hasEnvFile) issues.push("Create .env.local from .env.example and fill real Supabase/Vercel values.");

  console.log("");
  console.log("Required values:");
  for (const key of requiredEnv) {
    const value = envValues.get(key) ?? process.env[key] ?? "";
    const ok = Boolean(value) && !isPlaceholder(value);
    console.log(`- ${key}: ${formatStatus(ok)}`);
    if (!ok) issues.push(`${key} is missing or still a placeholder.`);
  }

  console.log("");
  console.log("Optional role codes:");
  for (const key of optionalEnv) {
    const value = envValues.get(key) ?? process.env[key] ?? "";
    console.log(`- ${key}: ${value && !isPlaceholder(value) ? "configured" : "not configured"}`);
  }

  console.log("");
  console.log(`Result: ${issues.length === 0 ? "ready for private Supabase/Vercel smoke test" : "not ready"}`);

  if (issues.length > 0) {
    console.log("");
    issues.forEach((issue) => console.log(`- ${issue}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
