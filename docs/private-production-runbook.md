# Private Production Runbook

This is the current hosting and operations runbook for the private three-child Family Education Management System.

Do not put access codes, Supabase keys, calendar tokens, or `.env.local` contents in this file.

## Canonical Services

| Layer | Service | Canonical target |
| --- | --- | --- |
| Source | GitHub private repository | `moirakk/family-education-private-three-child` |
| Production web app | Netlify | `https://bzs-family-edu.netlify.app` |
| Database | Supabase PostgreSQL | private family project |
| File storage | Supabase Storage | private `learning-materials` bucket |
| Backup host | Vercel | engineering fallback only |

Parents should receive only the canonical Netlify URL. A fallback deployment is not a second product URL and should not be installed on family devices unless the primary host is unavailable and the fallback has passed mobile acceptance.

## Deployment Flow

```mermaid
flowchart LR
  Local["Local workspace"] --> GitHub["GitHub main"]
  GitHub --> CI["GitHub Actions"]
  GitHub --> Netlify["Netlify production build"]
  Netlify --> PWA["Parent iPhone PWA"]
  Netlify --> API["Next.js private API"]
  API --> Postgres["Supabase PostgreSQL"]
  API --> Storage["Supabase Storage"]
```

Normal release:

1. Run the four local quality gates with Node.js 22.
2. Commit and push `main`.
3. Confirm GitHub Actions is green.
4. Confirm Netlify published the same commit hash.
5. Run the production mobile acceptance checklist when behavior changed.

## Required Netlify Environment Variables

Configure these in Netlify project environment variables. Values come from `.env.local`; never commit them.

```text
NEXT_PUBLIC_FAMILY_DATA_MODE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_PRIVATE_FAMILY_ID
PRIVATE_PARENT_ACCESS_MODE
PRIVATE_PARENT_ACCESS_CODE
PRIVATE_CAREGIVER_ACCESS_CODE
PRIVATE_TUTOR_ACCESS_CODE
PRIVATE_VIEWER_ACCESS_CODE
PRIVATE_SESSION_SECRET
SUPABASE_LEARNING_MATERIALS_BUCKET
PRIVATE_CALENDAR_TOKEN
```

Current private-family decision:

```text
PRIVATE_PARENT_ACCESS_MODE=open
```

The parent URL must therefore remain private. Tutor access continues through the dedicated code-bearing tutor link.

After changing any `NEXT_PUBLIC_*` variable, trigger a new production deploy because the value is embedded at build time.

## Quality Gates

Use Node.js 22, matching `package.json`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Production smoke command:

```bash
npm run private:smoke -- \
  --base-url https://bzs-family-edu.netlify.app \
  --expect-ready \
  --deep-private
```

The smoke script reads private values from `.env.local`. Do not paste those values into command history, documentation, screenshots, or review prompts.

## Backup And Recovery

The default full backup command now targets the canonical Netlify deployment:

```bash
npm run private:backup -- --out ./private-backups/latest
```

Expected output:

```text
database-export.json
storage/storage-manifest.json
storage/files/**
backup-manifest.json
```

Database and Storage recovery have already been rehearsed in a fresh Supabase project. Continue to use dry-run before every real restore.

## Incident Order

If the family reports that the app is unavailable:

1. Check whether the canonical Netlify URL opens on both Wi-Fi and mobile data.
2. Check the latest Netlify deploy and function logs.
3. Check `/api/health` without exposing its output publicly.
4. Check Supabase project status and quota.
5. Use the Vercel fallback only after confirming it runs the current GitHub commit and passes the smoke checklist.
6. Record the incident in `docs/private-observation-log.md`.

## Related Documents

- `README.md`
- `ROADMAP.md`
- `docs/private-production-handoff-and-observation.md`
- `docs/private-production-mobile-acceptance.md`
- `docs/private-observation-log.md`
- `docs/private-supabase-vercel-runbook.md` (legacy detailed setup reference)
