#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./private-env.mjs";

loadLocalEnv();

const defaultProductionUrl = "https://bzs-family-edu.netlify.app";

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
  console.log("Usage: npm run private:backup -- --out ./private-backups/latest");
  console.log("");
  console.log("Options:");
  console.log("- --base-url <url>   App URL to export database JSON from.");
  console.log("- --out <dir>        Output directory. Defaults to timestamped private-backup-*.");
  console.log("");
  console.log("Required env:");
  console.log("- PRIVATE_PARENT_ACCESS_CODE or PRIVATE_ACCESS_CODE when parent access mode is code.");
  console.log("- In open parent access mode, the script can obtain a session by visiting the app root.");
  console.log("- NEXT_PUBLIC_SUPABASE_URL");
  console.log("- SUPABASE_SERVICE_ROLE_KEY");
  console.log("- SUPABASE_LEARNING_MATERIALS_BUCKET, defaults to learning-materials");
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function normalizePrefix(prefix, name) {
  return prefix ? `${prefix}/${name}` : name;
}

function collectCookies(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const cookies = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function getParentSessionCookie(baseUrl) {
  const parentCode = process.env.PRIVATE_PARENT_ACCESS_CODE || process.env.PRIVATE_ACCESS_CODE;

  if (parentCode) {
    const loginResponse = await fetch(new URL("/api/access", baseUrl), {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code: parentCode,
        next: "/"
      })
    });

    if (loginResponse.status !== 303 && loginResponse.status !== 307) {
      throw new Error(`Access login failed with status ${loginResponse.status}`);
    }

    const cookie = collectCookies(loginResponse);
    if (!cookie.includes("family_private_session=")) throw new Error("Access login did not return a private session cookie.");
    return cookie;
  }

  const openModeResponse = await fetch(new URL("/", baseUrl), {
    method: "GET",
    redirect: "manual"
  });

  const cookie = collectCookies(openModeResponse);
  if (!cookie.includes("family_private_session=")) {
    throw new Error("Could not obtain a private session. Set PRIVATE_PARENT_ACCESS_CODE or enable PRIVATE_PARENT_ACCESS_MODE=open.");
  }

  return cookie;
}

async function exportDatabase(baseUrl, outputRoot) {
  const cookie = await getParentSessionCookie(baseUrl);

  const exportResponse = await fetch(new URL("/api/private/export", baseUrl), {
    headers: {
      Cookie: cookie
    }
  });
  const text = await exportResponse.text();

  if (exportResponse.status !== 200) {
    throw new Error(`Database export failed with status ${exportResponse.status}: ${text.slice(0, 160)}`);
  }

  const parsed = JSON.parse(text);
  const filePath = path.join(outputRoot, "database-export.json");
  await writeFile(filePath, JSON.stringify(parsed, null, 2));

  return {
    filePath,
    tableCount: Object.keys(parsed.data?.tables ?? {}).length,
    exportedAt: parsed.data?.exportedAt ?? null,
    familyId: parsed.data?.familyId ?? null
  };
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

  const buffer = Buffer.from(await data.arrayBuffer());
  const outputPath = path.join(outputRoot, "storage", "files", object.path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    backupSize: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

async function backupStorage(outputRoot) {
  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET || "learning-materials";
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const objects = await listStorageObjects(supabase, bucket);
  for (const object of objects) {
    const result = await downloadObject(supabase, bucket, object, outputRoot);
    object.backupSize = result.backupSize;
    object.sha256 = result.sha256;
  }

  const storageRoot = path.join(outputRoot, "storage");
  await mkdir(storageRoot, { recursive: true });
  const manifestPath = path.join(storageRoot, "storage-manifest.json");
  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    bucket,
    objectCount: objects.length,
    objects
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    manifestPath,
    bucket,
    objectCount: objects.length
  };
}

async function main() {
  if (isHelp()) {
    usage();
    return;
  }

  const outputRoot = getArgValue("--out") ?? `./private-backup-${timestamp()}`;
  const baseUrl = new URL(getArgValue("--base-url") || process.env.PRIVATE_BACKUP_BASE_URL || process.env.PRIVATE_SMOKE_BASE_URL || defaultProductionUrl).origin;

  await mkdir(outputRoot, { recursive: true });

  console.log("Creating full private backup:");
  console.log(`- app: ${baseUrl}`);
  console.log(`- out: ${outputRoot}`);

  const database = await exportDatabase(baseUrl, outputRoot);
  console.log(`- database: ${database.tableCount} tables -> ${database.filePath}`);

  const storage = await backupStorage(outputRoot);
  console.log(`- storage: ${storage.objectCount} objects -> ${storage.manifestPath}`);

  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    appUrl: baseUrl,
    database,
    storage,
    restore: {
      databaseDryRun: `npm run private:restore -- --file ${path.join(outputRoot, "database-export.json")} --storage-manifest ${storage.manifestPath} --dry-run`,
      storageDryRun: `npm run private:restore-storage -- --dir ${path.join(outputRoot, "storage")} --dry-run`
    }
  };

  const backupManifestPath = path.join(outputRoot, "backup-manifest.json");
  await writeFile(backupManifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Done. Backup manifest: ${backupManifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
