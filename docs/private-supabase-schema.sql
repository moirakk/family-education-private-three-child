-- 伯仲叔私有版核心 Supabase schema
-- This file extends the public MVP schema with the private pilot fields needed for long-term use.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.family_role as enum ('owner', 'parent', 'caregiver', 'viewer', 'tutor');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_category as enum ('school', 'tutoring', 'activity', 'exam', 'family');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.roadmap_status as enum ('planned', 'in_progress', 'achieved', 'at_risk');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.resource_kind as enum ('file', 'note', 'link', 'worksheet', 'book', 'video');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_source as enum ('system', 'parent', 'imported');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Tokyo',
  locale text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  calendar_name text not null default '家庭教育日历',
  calendar_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  access_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_settings_calendar_token_length check (length(calendar_token) >= 32)
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.family_role not null default 'parent',
  display_name text,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  first_name text not null,
  last_name text,
  birthdate date,
  age integer,
  grade text,
  stage_label text,
  school_name text,
  school_program text,
  avatar_color text not null default '#2563eb',
  interests text[] not null default '{}',
  focus_areas text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_age_reasonable check (age is null or age between 0 and 30),
  constraint children_first_name_not_blank check (length(trim(first_name)) > 0)
);

create table if not exists public.child_intake_profiles (
  child_id uuid primary key references public.children(id) on delete cascade,
  school_detail text,
  weekly_schedule text,
  important_dates text,
  current_goals text,
  parent_concerns text,
  private_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  category public.event_category not null,
  source public.event_source not null default 'parent',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  description text,
  recurrence_rule text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_not_blank check (length(trim(title)) > 0),
  constraint calendar_events_time_order check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.calendar_event_children (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (event_id, child_id)
);

create table if not exists public.learning_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  subject text not null,
  title text not null,
  record_date date not null default current_date,
  duration_minutes integer,
  score numeric(5,2),
  confidence integer check (confidence between 1 and 5),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_records_duration_positive check (duration_minutes is null or duration_minutes >= 0),
  constraint learning_records_score_range check (score is null or score between 0 and 100),
  constraint learning_records_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists public.education_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  target_date date,
  status public.roadmap_status not null default 'planned',
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_goals_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.education_goals(id) on delete cascade,
  title text not null,
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  constraint milestones_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  kind public.resource_kind not null,
  title text not null,
  description text,
  url text,
  storage_path text,
  subject text,
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_title_not_blank check (length(trim(title)) > 0),
  constraint resources_url_or_storage_or_note check (
    url is not null or storage_path is not null or description is not null or kind in ('note', 'worksheet', 'book', 'video')
  )
);

create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  subject text not null,
  kind public.resource_kind not null default 'file',
  file_name text,
  file_size bigint,
  mime_type text,
  storage_path text,
  external_url text,
  notes text,
  tags text[] not null default '{}',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_materials_title_not_blank check (length(trim(title)) > 0),
  constraint learning_materials_subject_not_blank check (length(trim(subject)) > 0),
  constraint learning_materials_file_size_positive check (file_size is null or file_size >= 0),
  constraint learning_materials_has_source check (
    storage_path is not null or external_url is not null or file_name is not null or notes is not null
  )
);

create table if not exists public.self_evaluations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  evaluation_date date not null default current_date,
  subject text not null,
  mood integer not null default 3 check (mood between 1 and 5),
  effort integer not null default 3 check (effort between 1 and 5),
  confidence integer not null default 3 check (confidence between 1 and 5),
  reflection text not null,
  next_step text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint self_evaluations_subject_not_blank check (length(trim(subject)) > 0),
  constraint self_evaluations_reflection_not_blank check (length(trim(reflection)) > 0)
);

create table if not exists public.tutor_feedback (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  tutor_name text not null,
  subject text not null,
  session_date date not null default current_date,
  duration_minutes integer,
  focus text not null,
  performance text,
  homework text,
  next_focus text,
  rating integer not null default 3 check (rating between 1 and 5),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_feedback_tutor_name_not_blank check (length(trim(tutor_name)) > 0),
  constraint tutor_feedback_subject_not_blank check (length(trim(subject)) > 0),
  constraint tutor_feedback_focus_not_blank check (length(trim(focus)) > 0),
  constraint tutor_feedback_duration_positive check (duration_minutes is null or duration_minutes >= 0)
);

create index if not exists family_members_family_user_idx on public.family_members(family_id, user_id);
create index if not exists children_family_id_idx on public.children(family_id);
create index if not exists calendar_events_family_starts_idx on public.calendar_events(family_id, starts_at);
create index if not exists calendar_event_children_child_idx on public.calendar_event_children(child_id);
create index if not exists learning_records_child_date_idx on public.learning_records(child_id, record_date desc);
create index if not exists education_goals_child_status_idx on public.education_goals(child_id, status);
create index if not exists resources_family_child_idx on public.resources(family_id, child_id);
create unique index if not exists resources_family_child_title_kind_idx
on public.resources(family_id, coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid), title, kind);
create index if not exists learning_materials_family_child_idx on public.learning_materials(family_id, child_id);
create index if not exists learning_materials_family_subject_idx on public.learning_materials(family_id, subject);
create index if not exists self_evaluations_child_date_idx on public.self_evaluations(child_id, evaluation_date desc);
create index if not exists tutor_feedback_child_date_idx on public.tutor_feedback(child_id, session_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_families_updated_at on public.families;
create trigger set_families_updated_at
before update on public.families
for each row execute function public.set_updated_at();

drop trigger if exists set_family_settings_updated_at on public.family_settings;
create trigger set_family_settings_updated_at
before update on public.family_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_children_updated_at on public.children;
create trigger set_children_updated_at
before update on public.children
for each row execute function public.set_updated_at();

drop trigger if exists set_child_intake_profiles_updated_at on public.child_intake_profiles;
create trigger set_child_intake_profiles_updated_at
before update on public.child_intake_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists set_learning_records_updated_at on public.learning_records;
create trigger set_learning_records_updated_at
before update on public.learning_records
for each row execute function public.set_updated_at();

drop trigger if exists set_education_goals_updated_at on public.education_goals;
create trigger set_education_goals_updated_at
before update on public.education_goals
for each row execute function public.set_updated_at();

drop trigger if exists set_resources_updated_at on public.resources;
create trigger set_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists set_learning_materials_updated_at on public.learning_materials;
create trigger set_learning_materials_updated_at
before update on public.learning_materials
for each row execute function public.set_updated_at();

drop trigger if exists set_self_evaluations_updated_at on public.self_evaluations;
create trigger set_self_evaluations_updated_at
before update on public.self_evaluations
for each row execute function public.set_updated_at();

drop trigger if exists set_tutor_feedback_updated_at on public.tutor_feedback;
create trigger set_tutor_feedback_updated_at
before update on public.tutor_feedback
for each row execute function public.set_updated_at();

alter table public.families enable row level security;
alter table public.family_settings enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.child_intake_profiles enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_children enable row level security;
alter table public.learning_records enable row level security;
alter table public.education_goals enable row level security;
alter table public.milestones enable row level security;
alter table public.resources enable row level security;
alter table public.learning_materials enable row level security;
alter table public.self_evaluations enable row level security;
alter table public.tutor_feedback enable row level security;

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = auth.uid()
      and role in ('owner', 'parent', 'caregiver')
  );
$$;

create or replace function public.get_calendar_feed_by_token(feed_token text)
returns table (
  event_id uuid,
  title text,
  category public.event_category,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  child_ids uuid[],
  child_names text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id as event_id,
    e.title,
    e.category,
    e.starts_at,
    e.ends_at,
    e.location,
    coalesce(array_agg(c.id order by c.first_name) filter (where c.id is not null), '{}') as child_ids,
    coalesce(array_agg(c.first_name order by c.first_name) filter (where c.id is not null), '{}') as child_names
  from public.family_settings fs
  join public.calendar_events e on e.family_id = fs.family_id
  left join public.calendar_event_children ec on ec.event_id = e.id
  left join public.children c on c.id = ec.child_id
  where fs.calendar_token = feed_token
    and e.starts_at >= now() - interval '18 months'
    and e.starts_at <= now() + interval '36 months'
  group by e.id, e.title, e.category, e.starts_at, e.ends_at, e.location
  order by e.starts_at;
$$;

grant execute on function public.get_calendar_feed_by_token(text) to anon, authenticated;

-- Supabase projects with "Automatically expose new tables" disabled need explicit API grants.
-- Private server APIs use service_role only; browser clients should not receive direct table grants.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

drop policy if exists "families select member" on public.families;
drop policy if exists "family settings select member" on public.family_settings;
drop policy if exists "family settings update editor" on public.family_settings;
drop policy if exists "family members select member" on public.family_members;
drop policy if exists "children select member" on public.children;
drop policy if exists "children write editor" on public.children;
drop policy if exists "intake select member" on public.child_intake_profiles;
drop policy if exists "intake write editor" on public.child_intake_profiles;
drop policy if exists "events select member" on public.calendar_events;
drop policy if exists "events write editor" on public.calendar_events;
drop policy if exists "event child links select member" on public.calendar_event_children;
drop policy if exists "event child links write editor" on public.calendar_event_children;
drop policy if exists "learning records select member" on public.learning_records;
drop policy if exists "learning records write editor" on public.learning_records;
drop policy if exists "goals select member" on public.education_goals;
drop policy if exists "goals write editor" on public.education_goals;
drop policy if exists "milestones select through goal" on public.milestones;
drop policy if exists "milestones write through goal" on public.milestones;
drop policy if exists "resources select member" on public.resources;
drop policy if exists "resources write editor" on public.resources;
drop policy if exists "learning materials select member" on public.learning_materials;
drop policy if exists "learning materials write editor" on public.learning_materials;
drop policy if exists "self evaluations select member" on public.self_evaluations;
drop policy if exists "self evaluations write editor" on public.self_evaluations;
drop policy if exists "tutor feedback select member" on public.tutor_feedback;
drop policy if exists "tutor feedback write editor" on public.tutor_feedback;

create policy "families select member"
on public.families for select
using (public.is_family_member(id));

create policy "family settings select member"
on public.family_settings for select
using (public.is_family_member(family_id));

create policy "family settings update editor"
on public.family_settings for update
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "family members select member"
on public.family_members for select
using (public.is_family_member(family_id));

create policy "children select member"
on public.children for select
using (public.is_family_member(family_id));

create policy "children write editor"
on public.children for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "intake select member"
on public.child_intake_profiles for select
using (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and public.is_family_member(c.family_id)
  )
);

create policy "intake write editor"
on public.child_intake_profiles for all
using (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and public.can_edit_family(c.family_id)
  )
)
with check (
  exists (
    select 1
    from public.children c
    where c.id = child_id
      and public.can_edit_family(c.family_id)
  )
);

create policy "events select member"
on public.calendar_events for select
using (public.is_family_member(family_id));

create policy "events write editor"
on public.calendar_events for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "event child links select member"
on public.calendar_event_children for select
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = event_id
      and public.is_family_member(e.family_id)
  )
);

create policy "event child links write editor"
on public.calendar_event_children for all
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = event_id
      and public.can_edit_family(e.family_id)
  )
)
with check (
  exists (
    select 1
    from public.calendar_events e
    where e.id = event_id
      and public.can_edit_family(e.family_id)
  )
);

create policy "learning records select member"
on public.learning_records for select
using (public.is_family_member(family_id));

create policy "learning records write editor"
on public.learning_records for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "goals select member"
on public.education_goals for select
using (public.is_family_member(family_id));

create policy "goals write editor"
on public.education_goals for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "milestones select through goal"
on public.milestones for select
using (
  exists (
    select 1
    from public.education_goals g
    where g.id = goal_id
      and public.is_family_member(g.family_id)
  )
);

create policy "milestones write through goal"
on public.milestones for all
using (
  exists (
    select 1
    from public.education_goals g
    where g.id = goal_id
      and public.can_edit_family(g.family_id)
  )
)
with check (
  exists (
    select 1
    from public.education_goals g
    where g.id = goal_id
      and public.can_edit_family(g.family_id)
  )
);

create policy "resources select member"
on public.resources for select
using (public.is_family_member(family_id));

create policy "resources write editor"
on public.resources for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "learning materials select member"
on public.learning_materials for select
using (public.is_family_member(family_id));

create policy "learning materials write editor"
on public.learning_materials for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "self evaluations select member"
on public.self_evaluations for select
using (public.is_family_member(family_id));

create policy "self evaluations write editor"
on public.self_evaluations for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));

create policy "tutor feedback select member"
on public.tutor_feedback for select
using (public.is_family_member(family_id));

create policy "tutor feedback write editor"
on public.tutor_feedback for all
using (public.can_edit_family(family_id))
with check (public.can_edit_family(family_id));
