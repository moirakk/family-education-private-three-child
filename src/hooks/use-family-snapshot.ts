"use client";

import type { FamilySnapshot } from "@/lib/core-types";
import { usePrivateSWR } from "./use-private-swr";

/** Family snapshot: children, calendar events, learning records, education goals, resources. */
export function useFamilySnapshot() {
  const { data, error, isLoading, mutate } = usePrivateSWR<FamilySnapshot>("/api/private/snapshot");

  return {
    snapshot: data ?? null,
    snapshotError: error ?? null,
    isLoading,
    mutateSnapshot: mutate
  };
}
