"use client";

import type { FamilyRepository } from "@/lib/core-types";
import { LocalFamilyRepository } from "@/lib/local-family-repository";
import { PrivateApiFamilyRepository } from "@/lib/private-api-family-repository";
import { SupabaseFamilyRepository } from "@/lib/supabase-family-repository";

type RepositoryMode = "local" | "private-api" | "supabase";

export function hasSupabaseBrowserConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createFamilyRepository(): FamilyRepository {
  if (getRepositoryMode() === "private-api") {
    return new PrivateApiFamilyRepository();
  }

  if (hasSupabaseBrowserConfig()) {
    return new SupabaseFamilyRepository();
  }

  return new LocalFamilyRepository();
}

export function getRepositoryMode() {
  const configuredMode = process.env.NEXT_PUBLIC_FAMILY_DATA_MODE;

  if (configuredMode === "private-api" || configuredMode === "supabase" || configuredMode === "local") {
    return configuredMode satisfies RepositoryMode;
  }

  return hasSupabaseBrowserConfig() ? "supabase" : "local";
}
