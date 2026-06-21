#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const tableOrder = [
  ["families", "id"],
  ["family_settings", "family_id"],
  ["children", "id"],
  ["child_intake_profiles", "child_id"],
  ["calendar_events", "id"],
  ["calendar_event_children", "event_id,child_id"],
  ["learning_records", "id"],
  ["education_goals", "id"],
  ["milestones", "id"],
  ["resources", "id"],
  ["learning_materials", "id"],
  ["self_evaluations", "id"],
  ["tutor_feedback", "id"]
];

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function normalizeBackup(payload) {
  if (payload?.tables) return payload;
  if (payload?.data?.tables) return payload.data;
  throw new Error("Backup JSON must contain a tables object from /api/private/export.");
}

async function restoreTable(supabase, tableName, onConflict, rows, dryRun) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`- ${tableName}: 0 rows`);
    return;
  }

  if (dryRun) {
    console.log(`- ${tableName}: ${rows.length} rows ready`);
    return;
  }

  const { error } = await supabase.from(tableName).upsert(rows, {
    onConflict,
    ignoreDuplicates: false
  });

  if (error) {
    throw new Error(`${tableName}: ${error.message}`);
  }

  console.log(`- ${tableName}: restored ${rows.length} rows`);
}

async function main() {
  const filePath = getArgValue("--file");
  const dryRun = process.argv.includes("--dry-run");

  if (!filePath) {
    throw new Error("Usage: npm run private:restore -- --file ./backup.json [--dry-run]");
  }

  const raw = await readFile(filePath, "utf8");
  const backup = normalizeBackup(JSON.parse(raw));
  const supabase = dryRun
    ? null
    : createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

  console.log(dryRun ? "Dry run restore plan:" : "Restoring private family backup:");
  console.log(`Family: ${backup.familyId ?? "unknown"}`);
  console.log(`Exported at: ${backup.exportedAt ?? "unknown"}`);

  for (const [tableName, onConflict] of tableOrder) {
    await restoreTable(supabase, tableName, onConflict, backup.tables[tableName], dryRun);
  }

  console.log("Done. File bodies are not restored by this script; Storage paths are preserved in metadata.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
