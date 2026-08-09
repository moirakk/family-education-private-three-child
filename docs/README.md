# Documentation Map

This folder contains the current operating documents and SQL artifacts for the private Family Education Management System.

## Current Documents

| Document | Purpose |
| --- | --- |
| [../README.md](../README.md) | Main repository overview, setup, production status, and operating model |
| [../ROADMAP.md](../ROADMAP.md) | Product and engineering roadmap |
| [../CHANGELOG.md](../CHANGELOG.md) | Human-readable history of major changes |
| [../SECURITY.md](../SECURITY.md) | Private-data and credential-handling rules |
| [deployment-guide.md](deployment-guide.md) | Step-by-step Supabase + Vercel setup guide |
| [private-production-runbook.md](private-production-runbook.md) | Current Vercel, Supabase, release, backup, and incident runbook |
| [manual-acceptance-checklist.md](manual-acceptance-checklist.md) | Manual acceptance checklist for local and production review |
| [private-production-mobile-acceptance.md](private-production-mobile-acceptance.md) | iPhone/PWA production acceptance checklist |
| [private-production-handoff-and-observation.md](private-production-handoff-and-observation.md) | Family handoff and observation checklist |
| [private-observation-log.md](private-observation-log.md) | Observation log for real parent/tutor use |

## Supabase Artifacts

| Artifact | Purpose |
| --- | --- |
| [private-supabase-schema.sql](private-supabase-schema.sql) | PostgreSQL schema, constraints, indexes, RLS policies, and calendar feed RPC |
| [private-supabase-storage.sql](private-supabase-storage.sql) | Storage bucket and policy setup |
| [private-pilot-seed-template.sql](private-pilot-seed-template.sql) | Initial private-family seed template |
| [supabase-inventory-check.sql](supabase-inventory-check.sql) | Read-only inventory/audit query for production Supabase state |
| [migrations/](migrations/) | Manual migration SQL files and rollback notes |
| [database-schema.sql](database-schema.sql) | Early SaaS design draft; do not execute for the private deployment |

## Archive

Older review briefs, Netlify notes, early architecture drafts, and stale debug handoffs live in [archive/](archive/). They are retained for historical context only. Prefer the current documents above when operating or modifying the app.

## Maintenance Rules

- Keep `README.md` as the canonical repository entry point.
- Keep `private-production-runbook.md` as the canonical operations document.
- Prefer updating an existing current document instead of adding one-off status files.
- Treat SQL files as operational artifacts. Test schema or storage policy changes against a non-production Supabase project first.
- Never paste `.env.local`, Supabase keys, access codes, calendar tokens, or real family contact details into docs.
