import { NextResponse } from "next/server";
import type { z } from "zod";
import { assertPrivateWriteConfigured } from "@/lib/supabase-admin";
import { getSupabaseUserClient } from "@/lib/supabase-user-context";
import type { AccessRole, TutorInviteScope } from "@/lib/private-access";

export type PrivateSupabaseClient = Awaited<ReturnType<typeof getSupabaseUserClient>>;

/** Thrown for any caller-input problem (missing/invalid fields). Always maps to HTTP 400. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function jsonError(error: unknown, status?: number) {
  const resolvedStatus = status ?? (error instanceof ValidationError ? 400 : 500);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: resolvedStatus });
}

/** Maps a Supabase/PostgREST error to the standard `{ error }` JSON response (HTTP 500 by default). */
export function supabaseError(error: { message: string }, status = 500) {
  return NextResponse.json({ error: error.message }, { status });
}

export type PrivateRouteContext = {
  familyId: string;
  supabase: PrivateSupabaseClient;
};

/**
 * Standard shell for /api/private CRUD handlers: builds the RLS-scoped
 * Supabase context and converts any thrown error into the shared JSON error
 * response (ValidationError -> 400, everything else -> 500). Route files keep
 * only the business logic.
 */
export function withPrivateRoute(
  handler: (context: PrivateRouteContext, request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const context = await getPrivateWriteContext(request);
      return await handler(context, request);
    } catch (error) {
      return jsonError(error);
    }
  };
}

/**
 * Error-boundary-only variant for handlers that must run role guards or
 * branching *before* creating the Supabase context (share-links, export,
 * tutor-context). The handler calls getPrivateWriteContext itself when needed.
 */
export function withPrivateErrorHandling(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      return jsonError(error);
    }
  };
}

/** Reads a required query-string parameter; missing/empty -> ValidationError (HTTP 400). */
export function requireQueryParam(request: Request, name: string) {
  const value = new URL(request.url).searchParams.get(name);
  if (!value) throw new ValidationError(`${name} is required`);
  return value;
}

/**
 * Validates `raw` against a zod schema, returning the parsed/typed data.
 * Replaces `as T` assertions on request bodies with real runtime validation.
 * Throws ValidationError (-> HTTP 400) with a readable message on failure.
 */
export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return result.data;
}

export function getAccessRoleFromRequest(request: Request): AccessRole | null {
  const role = request.headers.get("x-family-access-role");
  return role === "parent" || role === "caregiver" || role === "tutor" || role === "viewer" ? role : null;
}

export function getTutorInviteScopeFromRequest(request: Request): Omit<TutorInviteScope, "expiresAt"> | null {
  const childId = request.headers.get("x-family-tutor-child-id")?.trim();
  const tutorName = request.headers.get("x-family-tutor-name");
  const subject = request.headers.get("x-family-tutor-subject");

  if (!childId || !tutorName || !subject) return null;

  try {
    return {
      childId,
      tutorName: decodeURIComponent(tutorName).trim(),
      subject: decodeURIComponent(subject).trim()
    };
  } catch {
    return null;
  }
}

/**
 * Builds a user-level Supabase client scoped to the caller's already-verified
 * private access role (set by middleware.ts as request headers), so that
 * database RLS policies -- not this application code -- are the source of
 * truth for row access. Throws if no verified role header is present; every
 * route under this path is only reachable through middleware.ts, which
 * always attaches a verified role header before forwarding the request.
 */
export async function getPrivateWriteContext(request: Request) {
  assertPrivateWriteConfigured();
  const familyId = process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID;

  if (!familyId) {
    throw new Error("NEXT_PUBLIC_PRIVATE_FAMILY_ID is required before enabling private writes.");
  }

  const accessRole = getAccessRoleFromRequest(request);
  if (!accessRole) {
    throw new Error("Private API requires an authorized access role.");
  }

  const tutorScope = accessRole === "tutor" ? getTutorInviteScopeFromRequest(request) : null;

  const supabase = await getSupabaseUserClient({
    familyId,
    accessRole,
    tutorChildId: tutorScope?.childId
  });

  return { familyId, supabase };
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
