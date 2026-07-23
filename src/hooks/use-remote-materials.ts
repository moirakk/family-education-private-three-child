"use client";

import type { LearningMaterial } from "@/lib/types";
import { usePrivateSWR } from "./use-private-swr";

/** Remote learning-materials index from the private API. */
export function useRemoteMaterials() {
  const { data, error } = usePrivateSWR<LearningMaterial[]>("/api/private/materials");

  return { remoteMaterials: data, remoteMaterialsError: error ?? null };
}
