"use client";

export function isPrivateApiMode() {
  return process.env.NEXT_PUBLIC_FAMILY_DATA_MODE === "private-api";
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
