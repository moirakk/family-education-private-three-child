# Private Observation Log

This log is for the two-week real-use observation period after the private production handoff.

Do not paste access codes, calendar tokens, Supabase keys, child-private screenshots, school contact details, or tutor contact details into this file.

## Observation Window

| Item | Value |
| --- | --- |
| Production URL | `https://bzs-family-edu.netlify.app/` |
| Observation start | 2026-07-17 |
| Observation end | 2026-07-31 |
| Primary devices | Parent iPhone PWA, Moira desktop browser |
| Goal | Find real-use blockers and repeated friction before adding new features |

## How To Record Feedback

Use the table below for lightweight notes. If something is reproducible or needs work, open a GitHub issue using the existing templates:

- Bug: `.github/ISSUE_TEMPLATE/bug_report.md`
- Operations: `.github/ISSUE_TEMPLATE/ops_task.md`
- UI polish: `.github/ISSUE_TEMPLATE/ui_polish.md`

## Severity Rules

| Severity | Definition | Action |
| --- | --- | --- |
| Blocker | Parent or tutor cannot complete a real task | Fix immediately |
| Data risk | Data is missing, duplicated, not saved, or cannot be restored | Fix immediately |
| Annoying | Usable but causes repeated friction | Record and batch after observation |
| Nice-to-have | Improvement idea without real friction yet | Park until observation ends |

## Observation Table

| Date | Reporter | Device | Flow | What happened | Severity | Action |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16 | Moira | iPhone Safari | Local mobile smoke test | App opened successfully over the home LAN at `192.168.1.107:3000`; Today rendered without horizontal overflow. | Pass | Continue testing real entry flows on the same device. |
| 2026-07-16 | Moira | iPhone Safari | Production launch | Both current `*.vercel.app` aliases were unreachable from the phone, while the LAN build worked. This isolates the blocker to public hosting/domain reachability rather than the application build. | Blocker | Provide a phone-reachable HTTPS production domain before parent handoff. |
| 2026-07-16 | Codex | 390px mobile viewport | Quick entry | Header shortcuts originally navigated to the correct section but required a second tap to expand the form. Event, learning-record, and material shortcuts now open their forms directly; all three flows were rechecked with no horizontal overflow. | Annoying | Fixed and covered by the local mobile smoke test. |
| 2026-07-17 | Codex | Netlify production | Production deployment | Netlify published GitHub `main` commit `c24c3cb`; `bzs-family-edu.netlify.app` is now the canonical family URL. | Pass | Use this URL for the two-week observation period. |
| TBD | Moira | iPhone PWA | Parent install | Confirm home-screen launch after production deployment | TBD | Observe |
| TBD | Moira | iPhone PWA | Records upload | Upload one real learning material and confirm thumbnail/download | TBD | Observe |
| TBD | Tutor | Mobile browser | Tutor feedback | Submit one real post-lesson feedback | TBD | Observe |
| TBD | Parent | iPhone Calendar | iOS Calendar | Subscribe to calendar and confirm events appear | TBD | Observe |

## First Real-Use Checklist

- [ ] Parent opens the app from the iPhone home screen.
- [ ] Parent can understand Today without explanation.
- [x] Parent can open the event form from Today or Week in one tap.
- [ ] Parent can save or edit one real event from Week.
- [x] Parent can open the material upload panel from Today in one tap.
- [ ] Parent can upload one real material from Records and reopen it.
- [ ] Tutor feedback link opens only the tutor page.
- [ ] One tutor feedback submission appears in parent Records.
- [ ] iOS Calendar subscription works on the parent phone.
- [ ] Export/backup still works after at least one real material exists.

## Decisions To Revisit After Observation

Only revisit these after enough real-use notes exist:

- Whether parent trusted-link mode is still acceptable.
- Whether the "同步数据库" button should be explained better or removed.
- Whether Records needs more grouping after real materials and feedback accumulate.
- Whether Obsidian integration is still useful after trying the built-in materials vault.
- Whether tutor access needs separate links per teacher, child, or subject.
