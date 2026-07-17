alter type public.roadmap_status add value if not exists 'cancelled';

alter table public.education_goals
  add column if not exists plan_type text not null default 'other',
  add column if not exists custom_type text,
  add column if not exists sync_to_calendar boolean not null default true;

alter table public.education_goals
  drop constraint if exists education_goals_plan_type_check;

alter table public.education_goals
  add constraint education_goals_plan_type_check check (plan_type in ('exam', 'competition', 'school', 'other'));
