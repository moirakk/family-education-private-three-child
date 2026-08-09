# Legacy Vercel Fallback Environment Variables Checklist

> Vercel is no longer the canonical family host. Use `docs/private-production-runbook.md` for the active Netlify production environment. This file is retained only for rebuilding the engineering fallback.

> Use this checklist to manually copy values from `.env.local` into Vercel. Do not paste these values into chat or commit them to Git.

Project:

```text
family-education-private-three-child
```

Fallback URL: verify the current alias in the Vercel dashboard before use. Do not share it with parents until it passes mobile acceptance.

Environment:

```text
Production
```

Vercel settings page:

```text
https://vercel.com/moirahoumikis-projects/family-education-private-three-child/settings/environment-variables
```

## Required Variables

Copy each value exactly from `.env.local`:

```text
NEXT_PUBLIC_FAMILY_DATA_MODE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PRIVATE_FAMILY_ID
SUPABASE_SERVICE_ROLE_KEY
PRIVATE_PARENT_ACCESS_CODE
PRIVATE_SESSION_SECRET
SUPABASE_LEARNING_MATERIALS_BUCKET
```

## Optional Role Variables

Add these if they are present in `.env.local`:

```text
PRIVATE_CAREGIVER_ACCESS_CODE
PRIVATE_TUTOR_ACCESS_CODE
PRIVATE_VIEWER_ACCESS_CODE
PRIVATE_ACCESS_CODE
```

## Recommended Sensitivity

Mark these as sensitive:

```text
SUPABASE_SERVICE_ROLE_KEY
PRIVATE_PARENT_ACCESS_CODE
PRIVATE_CAREGIVER_ACCESS_CODE
PRIVATE_TUTOR_ACCESS_CODE
PRIVATE_VIEWER_ACCESS_CODE
PRIVATE_ACCESS_CODE
PRIVATE_SESSION_SECRET
```

The `NEXT_PUBLIC_*` values are browser-visible by design and do not need to be sensitive.

## After Saving Variables

Redeploy the project, then run:

```bash
npm run private:smoke -- \
  --base-url https://your-current-vercel-fallback.example \
  --expect-ready \
  --deep-private
```

If `/api/health` says `readyForPrivateDeploy: false`, check for a missing or placeholder environment variable and redeploy after fixing it.
