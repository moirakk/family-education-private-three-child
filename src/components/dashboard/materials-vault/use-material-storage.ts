"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRemoteMaterials } from "@/hooks/use-remote-materials";
import { getLocalFile } from "@/lib/local-file-store";
import { getPrivateApi, isPrivateApiMode } from "@/lib/private-api-client";
import type { LearningMaterial } from "@/lib/types";

const metadataStorageKey = "family-education-private-materials-v1";

export function useMaterialsPersistence(
  materials: LearningMaterial[],
  setMaterials: Dispatch<SetStateAction<LearningMaterial[]>>,
  setStatus: Dispatch<SetStateAction<string>>
) {
  const { remoteMaterials, remoteMaterialsError } = useRemoteMaterials();

  useEffect(() => {
    const raw = window.localStorage.getItem(metadataStorageKey);
    if (!raw) return;

    try {
      setMaterials(JSON.parse(raw) as LearningMaterial[]);
    } catch {
      setMaterials([]);
    }
  }, [setMaterials]);

  useEffect(() => {
    if (!remoteMaterials) return;

    setMaterials((current) => {
      const localOnly = current.filter((material) => material.id.startsWith("local-"));
      return [...remoteMaterials, ...localOnly];
    });
  }, [remoteMaterials, setMaterials]);

  useEffect(() => {
    if (remoteMaterialsError) {
      setStatus(`资料库读取数据库失败：${remoteMaterialsError.message}`);
    }
  }, [remoteMaterialsError, setStatus]);

  useEffect(() => {
    window.localStorage.setItem(metadataStorageKey, JSON.stringify(materials));
  }, [materials]);
}

export function useMaterialThumbnails(materials: LearningMaterial[]) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadThumbnails() {
      const nextUrls: Record<string, string> = {};
      const imageMaterials = materials.filter((material) => material.mimeType?.startsWith("image/"));

      await Promise.all(
        imageMaterials.map(async (material) => {
          try {
            if (material.localBlobId) {
              const blob = await getLocalFile(material.localBlobId);
              if (!blob) return;
              const objectUrl = URL.createObjectURL(blob);
              objectUrls.push(objectUrl);
              nextUrls[material.id] = objectUrl;
              return;
            }

            if (isPrivateApiMode() && !material.id.startsWith("local-")) {
              const data = await getPrivateApi<{ url: string }>(`/api/private/materials?materialId=${encodeURIComponent(material.id)}`);
              nextUrls[material.id] = data.url;
            }
          } catch {
            // Thumbnail loading is a preview nicety; opening the material still uses the normal download path.
          }
        })
      );

      if (!cancelled) setThumbnailUrls(nextUrls);
    }

    loadThumbnails();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [materials]);

  return thumbnailUrls;
}
