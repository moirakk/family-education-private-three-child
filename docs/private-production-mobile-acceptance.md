# Private Production Mobile Acceptance

Run this checklist on a real iPhone before sharing the system with parents. The canonical URL is:

```text
https://family-education-private-three-chil.vercel.app
```

Do not include screenshots containing child records, tutor codes, calendar tokens, or school details in public issues or review prompts.

## 1. Network And Install

- [ ] Open the canonical URL in Safari over Wi-Fi.
- [ ] Open it again over mobile data.
- [ ] Confirm it enters the parent dashboard without an access-code prompt.
- [ ] Confirm Today has no horizontal scrolling.
- [ ] Safari Share -> Add to Home Screen.
- [ ] Launch from the home-screen icon.
- [ ] Close and reopen the PWA; confirm the session remains usable.

## 2. Parent Data Flow

- [ ] Add one clearly marked test event from Today.
- [ ] Find it in Week and edit its time.
- [ ] Refresh the app and confirm the edit remains.
- [ ] Delete the test event and confirm it stays deleted after refresh.
- [ ] Add one test learning record.
- [ ] Edit it, refresh, and confirm the edited value remains.
- [ ] Delete the test learning record.

## 3. Learning Material Flow

- [ ] Take or choose one non-sensitive test photo.
- [ ] Upload it for one child.
- [ ] Confirm a thumbnail appears.
- [ ] Reopen the uploaded material.
- [ ] Refresh the app and confirm it still appears.
- [ ] Delete the test material and confirm it disappears.

## 4. Tutor Boundary

- [ ] Copy the tutor link from Settings.
- [ ] Open it in a private Safari tab or another phone.
- [ ] Confirm it shows only the tutor feedback page.
- [ ] Submit one test feedback item.
- [ ] Confirm the item appears in the parent Records view.
- [ ] Delete it from the parent view and confirm the inline warning appears first.

## 5. iOS Calendar

- [ ] Copy the calendar subscription link from Settings.
- [ ] Subscribe in iOS Calendar.
- [ ] Confirm current family events appear.
- [ ] Add a new event in the app and allow subscription refresh time.
- [ ] Confirm the event later appears in iOS Calendar.
- [ ] Confirm editing happens in the web app; the feed is intentionally one-way.

## 6. Backup After Real Data

- [ ] Run `npm run private:backup -- --out ./private-backups/latest`.
- [ ] Confirm both `database-export.json` and Storage files exist.
- [ ] Run database restore with `--dry-run`.
- [ ] Run Storage restore with `--dry-run`.
- [ ] Record the date and result in `docs/private-observation-log.md`.

## Acceptance Result

The family handoff is approved only when Sections 1-5 pass. A failure to save, reopen, edit, delete, or restrict tutor access is a blocker and should be fixed before broader sharing.
