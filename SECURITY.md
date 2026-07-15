# Security Policy

This repository contains a private family education management system. Treat all data, screenshots, access links, and operational notes as sensitive by default.

## Supported Scope

The active private deployment is the only supported production target:

- Next.js private PWA on Vercel
- Supabase PostgreSQL and Supabase Storage
- Trusted-device parent access
- Code-bearing tutor feedback link

The future commercial SaaS track is not covered by this policy until a separate multi-tenant architecture is created.

## Sensitive Data Rules

Never commit or paste into issues, PRs, review briefs, or external tools:

- `.env.local`
- Supabase service role key
- Supabase database password
- access codes
- tutor feedback code
- calendar tokens or full `webcal://` URLs
- private family contact details
- school/teacher contact details
- raw child self-evaluations, scores, or tutor feedback beyond synthetic examples

Use redacted examples when asking external tools such as Claude or Fable for help.

## Current Security Model

- Parent access can run in `PRIVATE_PARENT_ACCESS_MODE=open` for trusted-device private deployment.
- Tutor access is limited to `/tutor-feedback?code=...`.
- Sessions are signed `httpOnly` cookies with `Secure` and `SameSite=Strict`.
- Supabase service role usage is server-only.
- Private API routes enforce family and child ownership in application code.
- iOS Calendar uses a long random database token stored in `family_settings.calendar_token`.
- The service worker must not cache private API responses or HTML documents.

## Known Limitations

- Access-code rate limiting is not backed by shared storage. If parent access changes from trusted-link mode to code mode for broader sharing, migrate rate limiting to a shared store such as Upstash Redis.
- Supabase service role bypasses RLS, so application-level checks remain critical.
- Calendar tokens are embedded in URLs. If a calendar link leaks, rotate `family_settings.calendar_token` and have parents resubscribe.

## Reporting Or Handling A Security Issue

For this private repository, handle security issues privately:

1. Do not open a public issue containing secrets or child data.
2. Revoke or rotate exposed credentials first.
3. Document the incident in a private note or redacted GitHub issue.
4. Patch and verify locally.
5. Deploy to Vercel.
6. Re-run backup/export checks if data integrity may have been affected.

## Rotation Checklist

If a secret or link is exposed:

- Rotate Supabase service role key in Supabase and Vercel.
- Rotate `PRIVATE_SESSION_SECRET` and redeploy.
- Rotate affected access codes in Vercel and redeploy.
- Rotate `family_settings.calendar_token` if an iOS calendar URL leaked.
- Remove leaked values from local shell history, notes, screenshots, and external review prompts.
