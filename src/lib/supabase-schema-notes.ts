export const requiredSupabaseEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

export const privateDeploymentEnv = [
  "PRIVATE_ACCESS_CODE",
  "PRIVATE_CALENDAR_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_FAMILY_DATA_MODE"
] as const;
