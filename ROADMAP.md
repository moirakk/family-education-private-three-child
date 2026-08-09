# Family Education Management System Roadmap

This roadmap tracks the current private three-child version. Historical plans, review briefs, and earlier Netlify-era notes are archived under `docs/archive/`.

## Current Baseline

| Item | Current state |
| --- | --- |
| Main branch | `main` |
| Production URL | `https://family-education-private-three-chil.vercel.app/` |
| Hosting | Vercel Production |
| Database | Supabase PostgreSQL, `ap-northeast-1` |
| Access model | Private API mode with short-lived Supabase JWT sessions and trusted parent access |
| Validation gate | `npm run typecheck && npm run lint && npm run test && npm run build` |

## Shipped

- Four-task parent dashboard: Today, Week, Records, Settings.
- Private Supabase-backed APIs with RLS-based family scoping.
- Three-child seed data, calendar events, education goals, resources, tutor feedback, learning records, and learning materials support.
- Signed tutor feedback links scoped to child, tutor, and subject.
- iOS Calendar ICS/webcal endpoint.
- PWA manifest, icon, service worker, and offline page.
- Backup, restore, smoke-test, and Obsidian export scripts.
- Vercel production deployment verified on 2026-08-09.

## Current Focus

1. Real-device observation on the parent iPhone PWA.
2. Confirm tutor feedback flow on a tutor phone before regular use.
3. Run a fresh backup after the first real data changes.
4. Keep documentation and operational scripts aligned with the Vercel + Supabase production environment.

## Next Decisions

| Decision | When to decide | Default |
| --- | --- | --- |
| Keep or remove the Settings "sync database" action | After parent uses the app for one week | Remove or rename if it creates confusion |
| Add monitoring or error capture | After a repeated production issue | Keep manual observation for now |
| Add automated scheduled backup | After real data becomes daily-critical | Reuse existing backup/export path |
| Expand tutor access model | When multiple tutors need separate controls | Keep signed per-link access |

## Not In Scope For This Private Version

- Multi-family SaaS roles, billing, onboarding, or tenant management.
- Large new navigation sections before the two-week real-use observation period ends.
- Full offline editing and conflict resolution.
- New third-party monitoring services unless real incidents justify the extra account and maintenance.
