"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deletePrivateApi, isPrivateApiMode } from "@/lib/private-api-client";
import { getLocalOnlyItems } from "@/lib/reconciled-collection";
import type { TutorFeedback } from "@/lib/types";
import { usePrivateSWR } from "./use-private-swr";

const storageKey = "family-education-private-tutor-feedback-v1";

export function useTutorFeedback() {
  const [localItems, setLocalItems] = useState<TutorFeedback[]>([]);
  const [syncStatus, setSyncStatus] = useState("");
  const { data: remoteItems, error, mutate } = usePrivateSWR<TutorFeedback[]>("/api/private/tutor-feedback");

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      setLocalItems(JSON.parse(raw) as TutorFeedback[]);
    } catch {
      setLocalItems([]);
    }
  }, []);

  useEffect(() => {
    if (error) {
      console.error("Failed to load tutor feedback:", error);
      setSyncStatus("家教反馈读取失败，请刷新重试。");
    }
  }, [error]);

  const feedbackItems = useMemo(() => {
    if (!remoteItems) return localItems;
    return [...remoteItems, ...getLocalOnlyItems(localItems)];
  }, [localItems, remoteItems]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(feedbackItems));
  }, [feedbackItems]);

  const deleteFeedback = useCallback(
    async (feedbackId: string) => {
      const previousLocalItems = localItems;
      setLocalItems((current) => current.filter((feedback) => feedback.id !== feedbackId));

      if (!isPrivateApiMode() || feedbackId.startsWith("local-")) return;

      try {
        await mutate(
          async (current) => {
            await deletePrivateApi(`/api/private/tutor-feedback?feedbackId=${encodeURIComponent(feedbackId)}`);
            return (current ?? []).filter((feedback) => feedback.id !== feedbackId);
          },
          {
            optimisticData: (current) => (current ?? []).filter((feedback) => feedback.id !== feedbackId),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
          }
        );
        setSyncStatus("家教反馈已删除。");
      } catch (deleteError) {
        console.error("Failed to delete tutor feedback:", deleteError);
        setLocalItems(previousLocalItems);
        setSyncStatus("删除失败，请重试。");
      }
    },
    [localItems, mutate]
  );

  return { feedbackItems, syncStatus, deleteFeedback };
}
