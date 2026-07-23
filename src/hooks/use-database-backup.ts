"use client";

import { isPrivateApiMode } from "@/lib/private-api-client";
import { usePrivateSWR } from "./use-private-swr";

export type BackupStatus = "local" | "loading" | "database" | "failed";

export function useDatabaseBackup() {
  const { data, error, isLoading } = usePrivateSWR<unknown>("/api/private/export");

  const backupStatus: BackupStatus = !isPrivateApiMode()
    ? "local"
    : data !== undefined
      ? "database"
      : error
        ? "failed"
        : isLoading
          ? "loading"
          : "loading";

  return { databaseBackup: data ?? null, backupStatus };
}
