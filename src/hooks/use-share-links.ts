"use client";

import { usePrivateSWR } from "./use-private-swr";

export type ShareLinks = {
  parentUrl: string;
  tutorFeedbackUrl: string | null;
};

export function useShareLinks() {
  const { data, error } = usePrivateSWR<ShareLinks>("/api/private/share-links");

  return {
    shareLinks: data ?? null,
    shareLinksError: error ? error.message : ""
  };
}
