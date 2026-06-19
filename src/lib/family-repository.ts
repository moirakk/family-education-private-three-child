"use client";

import type { FamilyRepository } from "@/lib/core-types";
import { LocalFamilyRepository } from "@/lib/local-family-repository";
import { SupabaseFamilyRepository } from "@/lib/supabase-family-repository";

export function hasSupabaseBrowserConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createFamilyRepository(): FamilyRepository {
  if (hasSupabaseBrowserConfig()) {
    return new SupabaseFamilyRepository();
  }

  return new LocalFamilyRepository();
}

export function getRepositoryMode() {
  return hasSupabaseBrowserConfig() ? "supabase" : "local";
}
