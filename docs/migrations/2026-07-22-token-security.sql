begin;

-- Lightweight single-token revocation. Only ever written/read via the
-- Supabase service role (see src/lib/token-revocation.ts), so RLS is
-- enabled with zero policies: anon/authenticated keys get no access at
-- all, while the service role (which bypasses RLS) keeps working.
create table if not exists public.revoked_tokens (
  token_hash text primary key,
  expires_at timestamptz not null,
  reason text,
  revoked_at timestamptz not null default now()
);

create index if not exists revoked_tokens_expires_at_idx on public.revoked_tokens (expires_at);

alter table public.revoked_tokens enable row level security;

-- Cross-instance rate limiting for /api/access code submissions. Same
-- access model as above: service-role only, via src/lib/access-rate-limit.ts.
create table if not exists public.access_attempts (
  fingerprint text primary key,
  attempt_count integer not null default 0,
  window_reset_at timestamptz not null,
  last_attempt_at timestamptz
);

alter table public.access_attempts enable row level security;

commit;
