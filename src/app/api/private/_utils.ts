import { NextResponse } from "next/server";
import { assertPrivateWriteConfigured, getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { AccessRole } from "@/lib/private-access";

type PrivateSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

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

export function getAccessRoleFromRequest(request: Request): AccessRole | null {
  const role = request.headers.get("x-family-access-role");
  return role === "parent" || role === "caregiver" || role === "tutor" || role === "viewer" ? role : null;
}

export async function assertChildBelongsToFamily(supabase: PrivateSupabaseClient, familyId: string, childId: string) {
  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("family_id", familyId)
    .eq("id", childId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Invalid child for this family.");
}

export async function assertChildrenBelongToFamily(supabase: PrivateSupabaseClient, familyId: string, childIds: string[]) {
  const uniqueChildIds = [...new Set(childIds)];
  if (uniqueChildIds.length === 0) throw new Error("childIds is required");

  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("family_id", familyId)
    .in("id", uniqueChildIds);

  if (error) throw new Error(error.message);
  if ((data ?? []).length !== uniqueChildIds.length) {
    throw new Error("One or more children do not belong to this family.");
  }
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
