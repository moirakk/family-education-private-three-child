"use client";

import { useEffect } from "react";
import { usePrivateSWR } from "./use-private-swr";

export type ShareLinks = {
  parentUrl: string;
  tutorFeedbackUrl: string | null;
};

export function useShareLinks() {
  const { data, error } = usePrivateSWR<ShareLinks>("/api/private/share-links");

  useEffect(() => {
    if (error) {
      console.error("Failed to load share links:", error);
    }
  }, [error]);

  return {
    shareLinks: data ?? null,
    shareLinksError: error ? "分享链接读取失败，请刷新重试。" : ""
  };
}
