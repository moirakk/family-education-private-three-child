import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { AccessRole } from "@/lib/private-access";

const encoder = new TextEncoder();

// Short-lived: only needs to survive a single request round-trip to Supabase.
const requestJwtTtlSeconds = 60;

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function encodeJson(value: unknown) {
  return toBase64Url(encoder.encode(JSON.stringify(value)).buffer);
}

function getSupabaseJwtSecret() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is required to issue user-level Supabase requests.");
  }
  return secret;
}

type PrivateJwtClaims = {
  familyId: string;
  accessRole: AccessRole;
  tutorChildId?: string;
};

async function signPrivateAccessJwt({ familyId, accessRole, tutorChildId }: PrivateJwtClaims) {
  const secret = getSupabaseJwtSecret();
  const nowSeconds = Math.floor(Date.now() / 1000);

  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    role: "authenticated",
    aud: "authenticated",
    sub: familyId,
    family_id: familyId,
    access_role: accessRole,
    ...(tutorChildId ? { tutor_child_id: tutorChildId } : {}),
    iat: nowSeconds,
    exp: nowSeconds + requestJwtTtlSeconds
  });

  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

  return `${signingInput}.${toBase64Url(signature)}`;
}

/**
 * Returns a Supabase client scoped to the caller's already-verified private
 * access role, mimicking Supabase Auth's `authenticated` role by signing a
 * short-lived JWT with the project JWT secret. Row Level Security policies
 * read `family_id` / `access_role` / `tutor_child_id` from `auth.jwt()` to
 * authorize the request, since there is no real Supabase Auth session here.
 */
export async function getSupabaseUserClient(claims: PrivateJwtClaims) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const jwt = await signPrivateAccessJwt(claims);

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    }
  });
}

/**
 * Plain anon client for endpoints that intentionally do not require any
 * private access claims, e.g. calling a `security definer` RPC that is
 * already scoped by its own token argument.
 */
export function getSupabaseAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
