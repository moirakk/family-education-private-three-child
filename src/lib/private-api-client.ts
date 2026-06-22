"use client";

export type FamilyDataMode = "local" | "private-api" | "supabase" | "misconfigured";

export function getFamilyDataMode(): FamilyDataMode {
  const configuredMode = process.env.NEXT_PUBLIC_FAMILY_DATA_MODE;

  if (configuredMode === "local" || configuredMode === "private-api" || configuredMode === "supabase") {
    return configuredMode;
  }

  return process.env.NODE_ENV === "production" ? "misconfigured" : "local";
}

export function isPrivateApiMode() {
  return getFamilyDataMode() === "private-api";
}

export function isFamilyDataModeMisconfigured() {
  return getFamilyDataMode() === "misconfigured";
}

export async function postPrivateApi<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = (await response.json()) as { data?: T; error?: string };

  if (!response.ok || !result.data) {
    throw new Error(result.error ?? "Private API request failed");
  }

  return result.data;
}

export async function getPrivateApi<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const result = (await response.json()) as { data?: T; error?: string };

  if (!response.ok || result.data === undefined) {
    throw new Error(result.error ?? "Private API request failed");
  }

  return result.data;
}

export async function postPrivateFormData<T>(path: string, payload: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: payload
  });
  const result = (await response.json()) as { data?: T; error?: string };

  if (!response.ok || !result.data) {
    throw new Error(result.error ?? "Private API upload failed");
  }

  return result.data;
}

export async function putPrivateApi<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = (await response.json()) as { data?: T; error?: string };

  if (!response.ok || !result.data) {
    throw new Error(result.error ?? "Private API request failed");
  }

  return result.data;
}

export async function deletePrivateApi(path: string) {
  const response = await fetch(path, { method: "DELETE" });

  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? "Private API delete failed");
  }
}
