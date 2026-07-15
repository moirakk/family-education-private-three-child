# Changelog

This project follows a lightweight human-readable changelog. Dates use the Asia/Tokyo working timezone.

## 2026-07-16

### Repository

- Reworked the repository README into a clearer product, architecture, setup, deployment, and operations entry point.
- Added a documentation map in `docs/README.md`.
- Added a pull request template with verification and privacy checks.
- Aligned GitHub Actions with Node 22.
- Added private deployment access-mode guidance to `.env.example`.

## 2026-07-08

### Product

- Renamed the fourth app mode from "More" to "Settings".
- Reorganized Settings into account/share links, data/export, app installation, and intake data.
- Reworked Records into high-frequency daily records with lower-frequency self-evaluation and archive sections folded away.
- Limited self-evaluation to the eldest child for the private version.
- Gated growth trend summaries until at least four weeks of learning records exist.

### Deployment

- Deployed the updated private PWA to Vercel.
- Corrected the production alias to `family-education-private-three-child.vercel.app`.

## 2026-07-06

### Reliability

- Completed a backup -> fresh Supabase project -> restore rehearsal.
- Verified database restore for the private family seed data.
- Verified storage restore scripts in an empty-bucket scenario.

## 2026-07-05

### Product

- Refined the learning materials vault into a mobile-friendly album mode.
- Added child filtering, image thumbnail previews, collapsed upload flow, and client-side image compression.

## Earlier Milestones

- Built the private three-child dashboard shell.
- Added Supabase-backed private APIs.
- Added child, event, learning record, roadmap, material, self-evaluation, and tutor feedback flows.
- Added iOS Calendar ICS/webcal support.
- Added PWA manifest, service worker, icon, and offline page.
- Added backup, restore, smoke test, and Obsidian export scripts.
