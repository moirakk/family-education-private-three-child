import { NextResponse } from "next/server";
import { assertPrivateWriteConfigured, getSupabaseAdminClient } from "@/lib/supabase-admin";

export function getPrivateWriteContext() {
  assertPrivateWriteConfigured();
  const familyId = process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID;

  if (!familyId) {
    throw new Error("NEXT_PUBLIC_PRIVATE_FAMILY_ID is required before enabling private writes.");
  }

  return {
    familyId,
    supabase: getSupabaseAdminClient()
  };
}

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status });
}

export function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

export function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function scoreOneToFive(value: unknown, fallback = 3) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(5, Math.max(1, numberValue));
}
