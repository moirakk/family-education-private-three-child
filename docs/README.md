# Documentation Map

This folder contains product, architecture, deployment, and review notes for the private Family Education Management System.

## Start Here

| Document | Purpose |
| --- | --- |
| [../README.md](../README.md) | Main repository overview, setup, deployment, and operating model |
| [../ROADMAP.md](../ROADMAP.md) | Living product and engineering roadmap |
| [../CHANGELOG.md](../CHANGELOG.md) | Human-readable history of major changes |
| [../SECURITY.md](../SECURITY.md) | Private-data and credential-handling rules |
| [private-product-code-map.md](private-product-code-map.md) | Code-level map of modules, APIs, and data flows |
| [private-core-architecture.md](private-core-architecture.md) | Private-version architecture decisions |

## Supabase And Deployment

| Document | Purpose |
| --- | --- |
| [private-supabase-schema.sql](private-supabase-schema.sql) | PostgreSQL schema, constraints, indexes, RLS policies, and calendar feed RPC |
| [private-supabase-storage.sql](private-supabase-storage.sql) | Storage bucket and policy setup |
| [private-pilot-seed-template.sql](private-pilot-seed-template.sql) | Initial private-family seed template |
| [private-supabase-vercel-runbook.md](private-supabase-vercel-runbook.md) | Supabase + Vercel deployment runbook |
| [private-vercel-env-checklist.md](private-vercel-env-checklist.md) | Vercel environment variable checklist |
| [private-pwa-deployment-guide.md](private-pwa-deployment-guide.md) | iPhone PWA and iOS Calendar deployment guide |
| [private-production-handoff-and-observation.md](private-production-handoff-and-observation.md) | Production handoff, parent/tutor setup, and two-week observation checklist |
| [private-observation-log.md](private-observation-log.md) | Living observation log for real parent/tutor use |

## Product Planning

| Document | Purpose |
| --- | --- |
| [private-three-child-requirements.md](private-three-child-requirements.md) | Private three-child requirements |
| [product-architecture.md](product-architecture.md) | Original product architecture for broader family education platform |
| [two-track-roadmap.md](two-track-roadmap.md) | Private custom version vs future commercial version |
| [wireframes.md](wireframes.md) | Early wireframe notes |
| [demo-guide.md](demo-guide.md) | Demo walkthrough and presentation notes |
| [today-delivery-runbook.md](today-delivery-runbook.md) | Earlier delivery checklist |

## External Review Briefs

These files are useful when asking Claude, Fable, or another reviewer for analysis. Do not include `.env.local`, secrets, access codes, calendar tokens, or private family contact details.

| Document | Purpose |
| --- | --- |
| [claude-analysis-readme.md](claude-analysis-readme.md) | Earlier Claude-oriented analysis package |
| [claude-current-review-2026-06-23.md](claude-current-review-2026-06-23.md) | Security and architecture review brief |
| [private-current-status-for-claude.md](private-current-status-for-claude.md) | Current-status handoff for external code review |
| [private-three-child-debug-brief.md](private-three-child-debug-brief.md) | Debug-oriented overview |
| [private-next-optimization-brief-for-fable.md](private-next-optimization-brief-for-fable.md) | Current Fable review brief for UI, IA, and long-term-use critique |

## Maintenance Notes

- `README.md` is the canonical public-facing/private-repo entry point.
- `ROADMAP.md` is the living status tracker. Prefer updating it instead of adding a new one-off status file.
- SQL files in this folder should be treated as operational artifacts. Changes to schema or storage policy should be reviewed carefully and tested against a non-production Supabase project first.
- Review briefs may become stale. When in doubt, trust `README.md`, `ROADMAP.md`, and the source code over older external-review notes.
