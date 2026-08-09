# Private Production Handoff And Observation

This document is the handoff note for the current private three-child production version. It is meant for Moira, family testers, and external reviewers such as Fable or Claude.

Do not paste secrets, access codes, calendar tokens, Supabase keys, or `.env.local` values into this document.

## Current Production State

| Item | Status |
| --- | --- |
| Production URL | `https://family-education-private-three-chil.vercel.app/` |
| Primary hosting | Vercel Production, deployed from GitHub `main` |
| Latest verified deployment | `family-education-private-three-child-mob8shtz2.vercel.app` |
| GitHub repository | `https://github.com/moirakk/family-education-private-three-child` |
| Parent access model | Private API mode with trusted parent session |
| Tutor access model | Signed link scoped to one child, tutor, and subject |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage bucket for learning materials |
| Mobile install | PWA via Safari "Add to Home Screen" |
| iOS Calendar | One-way ICS/webcal feed |

## What Was Just Shipped

The latest production deployment includes the Fable R1-R3 refinements:

1. Learning-record and event-entry forms are collapsed by default.
2. Parent-facing tutor feedback deletion now requires inline confirmation.
3. Tutor feedback form labels clearly mark the four required fields.
4. Single-child events use a child-color left border for faster scanning.
5. The PWA install card is hidden once the app is opened from the home screen.
6. Today screen copy was reduced to avoid duplicate suggestions.
7. Settings wording now uses "孩子建档资料" instead of "工作台/初始化资料".

## Parent Handoff Flow

Use this when installing the system on a parent device.

1. Open the production URL in Safari on the parent's iPhone.
2. Confirm the dashboard opens directly.
3. Tap Safari share.
4. Choose "Add to Home Screen".
5. Rename the icon if needed.
6. Open from the home screen icon.
7. Confirm the app opens without asking for an access code.
8. Check the four bottom tabs: Today, Week, Records, Settings.
9. In Settings, copy or verify the tutor feedback link if needed.
10. Do not share the parent production URL outside trusted family devices.

Use only the Vercel production URL above for the family handoff. Do not mix historical or preview URLs on parent devices.

## Tutor Handoff Flow

Use this only when a tutor is ready to submit structured lesson feedback.

1. Copy the tutor feedback link from Settings.
2. Send it directly to the tutor.
3. Ask the tutor to open it on mobile.
4. Confirm they only see the tutor feedback form, not the full family dashboard.
5. Ask them to submit one test feedback after a real lesson.
6. Parent checks the feedback list in Records.

Do not send the parent production URL to tutors.

## Daily Parent Usage

The expected daily pattern is intentionally small:

1. Open from the iPhone home screen.
2. Check Today first.
3. If something changed this week, go to Week and add or edit events.
4. If there is a new worksheet, photo, or note, go to Records and upload it.
5. If a tutor sent feedback, review it in Records.
6. Use Settings only for sharing, export, backup, or app setup.

## Two-Week Observation Rules

For the next two weeks, avoid feature expansion. Only collect issues and fix actual blockers.

Use [private-observation-log.md](private-observation-log.md) as the living observation log. Record observations in this shape:

| Date | Person | Device | What happened | Severity | Decision |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | Parent / Tutor / Moira | iPhone / Mac / Other | Short description | Blocker / Annoying / Nice-to-have | Fix now / Observe / Later |

Severity guide:

| Severity | Meaning |
| --- | --- |
| Blocker | Prevents parent or tutor from using the system |
| Annoying | Usable, but creates repeated friction |
| Nice-to-have | Improvement idea, not urgent |

## First Week Checks

Run these checks during real use:

- Parent can open the PWA from the home screen without re-entering a code.
- Today screen is understandable within 10 seconds.
- Week screen can add an event without confusion.
- Records screen can upload at least one real learning material.
- Tutor link works on a tutor phone.
- Tutor feedback appears in parent Records.
- iOS Calendar subscription shows expected events.
- Export/backup still works after real data exists.

The detailed device-by-device steps are in [private-production-mobile-acceptance.md](private-production-mobile-acceptance.md).

## Known Decisions

| Decision | Current Choice | Revisit When |
| --- | --- | --- |
| Parent access | Trusted-device private link | If the parent URL is shared beyond trusted devices |
| Tutor access | Dedicated tutor feedback URL | If multiple tutors need separated access |
| Offline support | Read-oriented PWA shell only | If parents need offline editing |
| Backups | Manual scripts plus restore rehearsal | If real data volume grows or family depends on it daily |
| Obsidian integration | Not implemented | If parents explicitly want file-level notes outside the dashboard |

## Do Not Do During Observation

- Do not add a fifth tab.
- Do not redesign the whole UI again.
- Do not introduce a new auth system unless the parent URL security boundary becomes unacceptable.
- Do not add commercial SaaS abstractions to the private family version.
- Do not store secrets in GitHub, docs, screenshots, or external review prompts.

## Reviewer Prompt

If asking Fable or Claude to review the product, send:

1. GitHub repository link.
2. `README.md`.
3. `ROADMAP.md`.
4. This document.
5. `docs/private-observation-log.md`.
6. Screenshots from a real iPhone if available.

Ask reviewers to focus on production usability, privacy risks, and what should be observed during real family use. Avoid asking for new feature ideas until the two-week observation period has real feedback.
