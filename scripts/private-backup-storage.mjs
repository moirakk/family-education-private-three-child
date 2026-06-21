#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function isHelp() {
  return process.argv.includes("--help") || process.argv.includes("-h");
}

function usage() {
  console.log("Usage: npm run private:backup-storage -- --out ./private-storage-backup");
  console.log("");
  console.log("Required env:");
  console.log("- NEXT_PUBLIC_SUPABASE_URL");
  console.log("- SUPABASE_SERVICE_ROLE_KEY");
  console.log("- SUPABASE_LEARNING_MATERIALS_BUCKET, defaults to learning-materials");
}

function normalizePrefix(prefix, name) {
  return prefix ? `${prefix}/${name}` : name;
}

async function listStorageObjects(supabase, bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const objectPath = normalizePrefix(prefix, item.name);
      if (item.metadata) {
        objects.push({
          path: objectPath,
          size: item.metadata.size ?? null,
          mimetype: item.metadata.mimetype ?? null,
          updatedAt: item.updated_at ?? null
        });
      } else {
        objects.push(...(await listStorageObjects(supabase, bucket, objectPath)));
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return objects;
}

async function downloadObject(supabase, bucket, object, outputRoot) {
  const { data, error } = await supabase.storage.from(bucket).download(object.path);
  if (error) throw new Error(`${object.path}: ${error.message}`);
  if (!data) throw new Error(`${object.path}: empty download`);

  const outputPath = path.join(outputRoot, "files", object.path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(await data.arrayBuffer()));
  return outputPath;
}

async function main() {
  if (isHelp()) {
    usage();
    return;
  }

  const outputRoot = getArgValue("--out") ?? `./private-storage-backup-${new Date().toISOString().replaceAll(":", "-")}`;
  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET || "learning-materials";
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  await mkdir(outputRoot, { recursive: true });
  const objects = await listStorageObjects(supabase, bucket);

  console.log(`Backing up ${objects.length} objects from ${bucket}`);
  for (const object of objects) {
    const outputPath = await downloadObject(supabase, bucket, object, outputRoot);
    console.log(`- ${object.path} -> ${outputPath}`);
  }

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    bucket,
    objectCount: objects.length,
    objects
  };
  await writeFile(path.join(outputRoot, "storage-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Done. Manifest: ${path.join(outputRoot, "storage-manifest.json")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
