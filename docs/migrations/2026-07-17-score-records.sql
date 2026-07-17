begin;

alter table public.learning_records
  add column if not exists max_score numeric(6,2),
  add column if not exists exam_type text not null default 'quiz';

alter table public.learning_records
  drop constraint if exists learning_records_score_range,
  drop constraint if exists learning_records_max_score_positive,
  drop constraint if exists learning_records_exam_type_check;

alter table public.learning_records
  add constraint learning_records_score_range check (score is null or score >= 0),
  add constraint learning_records_max_score_positive check (max_score is null or max_score > 0),
  add constraint learning_records_exam_type_check check (exam_type in ('quiz', 'monthly', 'midterm', 'final', 'other'));

update public.learning_records
set max_score = 100
where max_score is null and score is not null;

commit;
