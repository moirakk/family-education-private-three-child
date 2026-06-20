# Private Supabase + Vercel Runbook

> Goal: make Family Education Management System persist data long-term for the private family version.

## 1. Create Supabase Project

Create a new Supabase project and copy:

- Project URL
- anon public key
- service_role key

Keep `service_role` server-only. It goes into `.env.local` and Vercel environment variables, never into client code.

## 2. Run SQL In This Order

Open Supabase SQL Editor and run:

1. `docs/private-supabase-schema.sql`
2. `docs/private-supabase-storage.sql`
3. `docs/private-pilot-seed-template.sql`

Before running the seed file, replace:

```sql
owner_user_id uuid := '00000000-0000-0000-0000-000000000000';
```

with the real Supabase Auth user id.

The default private family id is:

```text
11111111-1111-1111-1111-111111111111
```

## 3. Local `.env.local`

Create `.env.local` from `.env.example`:

```text
NEXT_PUBLIC_FAMILY_DATA_MODE="private-api"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-role-key"
NEXT_PUBLIC_PRIVATE_FAMILY_ID="11111111-1111-1111-1111-111111111111"
PRIVATE_ACCESS_CODE="choose-a-family-access-code"
PRIVATE_CALENDAR_TOKEN="choose-a-long-random-calendar-token"
SUPABASE_LEARNING_MATERIALS_BUCKET="learning-materials"
```

Then run:

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

## 4. Local Smoke Test

Open:

```text
http://127.0.0.1:3000/api/health
```

Expected:

```json
{
  "ok": true,
  "readyForPrivateDeploy": true
}
```

You can also open the dashboard section:

```text
http://127.0.0.1:3000/#deploy-status
```

It shows the same readiness checks inside the app UI.

Then open:

```text
http://127.0.0.1:3000
```

Test these writes:

- Add calendar event.
- Add learning record.
- Upload a learning material file.
- Add learning material external link metadata.
- Add child self-evaluation.
- Add tutor feedback.
- Click `同步数据库` in parent intake workspace.

Verify records appear in Supabase tables:

- `calendar_events`
- `calendar_event_children`
- `learning_records`
- `learning_materials`
- `self_evaluations`
- `tutor_feedback`
- `child_intake_profiles`
- `storage.objects` where `bucket_id = 'learning-materials'`

Then open:

```text
http://127.0.0.1:3000/api/private/export
```

Expected JSON includes:

```text
"source":"supabase-private-api"
"learning_materials"
"self_evaluations"
"tutor_feedback"
```

## 5. iOS Calendar Test

Open:

```text
http://127.0.0.1:3000/api/calendar/ios?token=<PRIVATE_CALENDAR_TOKEN>
```

Expected content includes:

```text
BEGIN:VCALENDAR
X-WR-CALNAME:Family Education Calendar
```

For Vercel deployment, subscribe on iPhone with:

```text
webcal://<your-domain>/api/calendar/ios?token=<PRIVATE_CALENDAR_TOKEN>
```

## 6. Vercel Environment Variables

Add the same values from `.env.local` to Vercel:

- `NEXT_PUBLIC_FAMILY_DATA_MODE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PRIVATE_FAMILY_ID`
- `PRIVATE_ACCESS_CODE`
- `PRIVATE_CALENDAR_TOKEN`
- `SUPABASE_LEARNING_MATERIALS_BUCKET`

Deploy from the private branch/repo that contains this private version.

## 7. Current Persistence Status

Persisted to PostgreSQL:

- Family workspace
- Children
- Intake profiles
- Calendar events
- Learning records
- Learning material metadata
- Self-evaluations
- Tutor feedback
- Education goals
- Resources
- iOS calendar feed from database

Persisted to Supabase Storage:

- Learning material file bodies in the private `learning-materials` bucket
- Download access through short-lived signed URLs

Backup/export:

- `GET /api/private/export` returns a database-backed JSON metadata backup.
- Learning material file bodies remain in private Storage; the export includes storage paths and metadata.

Still next step:

- Add richer file management such as replace file, folder grouping, and preview thumbnails.
