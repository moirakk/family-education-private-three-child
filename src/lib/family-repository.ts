"use client";

import type { FamilyRepository } from "@/lib/core-types";
import { LocalFamilyRepository } from "@/lib/local-family-repository";
import { PrivateApiFamilyRepository } from "@/lib/private-api-family-repository";
import { SupabaseFamilyRepository } from "@/lib/supabase-family-repository";
import { getFamilyDataMode } from "@/lib/private-api-client";

type RepositoryMode = "local" | "private-api" | "supabase";

export function hasSupabaseBrowserConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createFamilyRepository(): FamilyRepository {
  const mode = getRepositoryMode();

  if (mode === "misconfigured") {
    throw new Error("NEXT_PUBLIC_FAMILY_DATA_MODE must be set in production.");
  }

  if (mode === "private-api") {
    return new PrivateApiFamilyRepository();
  }

  if (hasSupabaseBrowserConfig()) {
    return new SupabaseFamilyRepository();
  }

  return new LocalFamilyRepository();
}

export function getRepositoryMode() {
  const configuredMode = getFamilyDataMode();
  if (configuredMode !== "misconfigured") return configuredMode satisfies RepositoryMode;

  return "misconfigured";
}
