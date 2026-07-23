"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { getPrivateApi, isPrivateApiMode } from "@/lib/private-api-client";

/**
 * Shared SWR wrapper for private API GET endpoints.
 * Returns a paused hook (key = null) when the app is not in private-api mode,
 * so callers keep their local-only fallback behavior.
 */
export function usePrivateSWR<T>(path: string | null, config?: SWRConfiguration<T, Error>) {
  return useSWR<T, Error>(isPrivateApiMode() ? path : null, (key: string) => getPrivateApi<T>(key), config);
}
