-- 伯仲叔私有版 Supabase seed template
-- 先运行 docs/private-supabase-schema.sql，再运行本文件。
-- 使用前请把 owner_user_id 替换成 Supabase Auth 里家长账号的 user id。

do $$
declare
  owner_user_id uuid := '00000000-0000-0000-0000-000000000000';
  target_family_id uuid := '11111111-1111-1111-1111-111111111111';
  boyang_id uuid := '22222222-2222-2222-2222-222222222222';
  zhongyang_id uuid := '33333333-3333-3333-3333-333333333333';
  shuyang_id uuid := '44444444-4444-4444-4444-444444444444';
  goal_boyang_id uuid := '55555555-5555-5555-5555-555555555555';
  goal_zhongyang_id uuid := '66666666-6666-6666-6666-666666666666';
  goal_shuyang_id uuid := '77777777-7777-7777-7777-777777777777';
begin
  if owner_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Replace owner_user_id with a real Supabase auth.users.id before running this seed.';
  end if;

  insert into public.families (id, name, timezone, locale)
  values (target_family_id, 'Family Education Management System', 'Asia/Tokyo', 'zh-CN')
  on conflict (id) do update set
    name = excluded.name,
    timezone = excluded.timezone,
    locale = excluded.locale,
    updated_at = now();

  insert into public.family_settings (family_id, calendar_name)
  values (target_family_id, 'Family Education Calendar')
  on conflict (family_id) do update set
    calendar_name = excluded.calendar_name,
    updated_at = now();

  insert into public.family_members (family_id, user_id, role, display_name)
  values (target_family_id, owner_user_id, 'owner', '家长')
  on conflict (family_id, user_id) do update set
    role = excluded.role,
    display_name = excluded.display_name;

  insert into public.children (
    id,
    family_id,
    first_name,
    age,
    grade,
    stage_label,
    school_name,
    school_program,
    avatar_color,
    interests,
    focus_areas
  )
  values
    (
      boyang_id,
      target_family_id,
      '伯杨',
      12,
      '马上升初一 / 小升初衔接期',
      '小升初衔接期',
      '主学校信息待补充',
      '小升初衔接 + 数学体系化 + 英语阅读写作',
      '#0f766e',
      array['阅读', '数学', '项目制学习'],
      array['小升初衔接', '数学体系化', '英文写作']
    ),
    (
      zhongyang_id,
      target_family_id,
      '仲杨',
      10,
      '马上升五年级 / 高年级准备期',
      '五年级准备期',
      '主学校信息待补充',
      '校内课程 + 阅读习惯 + 数学基础巩固',
      '#2563eb',
      array['科学', '运动', '动手实验'],
      array['高年级过渡', '阅读稳定性', '作业独立性']
    ),
    (
      shuyang_id,
      target_family_id,
      '叔杨',
      7,
      '马上升二年级 / 低年级习惯成型期',
      '二年级习惯成型期',
      '主学校信息待补充',
      '低年级校内基础 + 拼读启蒙 + 日常表达',
      '#db2777',
      array['画画', '故事', '音乐律动'],
      array['低年级习惯', '拼读启蒙', '专注力']
    )
  on conflict (id) do update set
    first_name = excluded.first_name,
    age = excluded.age,
    grade = excluded.grade,
    stage_label = excluded.stage_label,
    school_name = excluded.school_name,
    school_program = excluded.school_program,
    avatar_color = excluded.avatar_color,
    interests = excluded.interests,
    focus_areas = excluded.focus_areas,
    updated_at = now();

  insert into public.child_intake_profiles (child_id, current_goals)
  values
    (boyang_id, '小升初衔接、数学体系化、英文写作'),
    (zhongyang_id, '高年级过渡、阅读稳定性、作业独立性'),
    (shuyang_id, '低年级习惯、拼读启蒙、专注力')
  on conflict (child_id) do update set
    current_goals = excluded.current_goals,
    updated_at = now();

  insert into public.calendar_events (id, family_id, title, category, source, starts_at, ends_at, location, created_by)
  values
    ('88888888-8888-8888-8888-888888888801', target_family_id, '周一校内事项确认', 'school', 'system', '2026-06-22 08:00:00+09', '2026-06-22 08:20:00+09', '家庭晨间检查', owner_user_id),
    ('88888888-8888-8888-8888-888888888802', target_family_id, '伯杨：数学错题复盘', 'tutoring', 'system', '2026-06-22 19:00:00+09', '2026-06-22 19:45:00+09', '家庭学习桌', owner_user_id),
    ('88888888-8888-8888-8888-888888888803', target_family_id, '仲杨：阅读打卡 + 口头复述', 'family', 'system', '2026-06-23 19:30:00+09', '2026-06-23 20:00:00+09', '客厅阅读角', owner_user_id),
    ('88888888-8888-8888-8888-888888888804', target_family_id, '叔杨：拼读小游戏', 'activity', 'system', '2026-06-24 18:30:00+09', '2026-06-24 18:50:00+09', '家庭互动区', owner_user_id),
    ('88888888-8888-8888-8888-888888888805', target_family_id, '三人周复盘', 'exam', 'system', '2026-06-28 10:00:00+09', '2026-06-28 11:00:00+09', '家庭会议', owner_user_id)
  on conflict (id) do update set
    title = excluded.title,
    category = excluded.category,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    location = excluded.location,
    updated_at = now();

  insert into public.calendar_event_children (event_id, child_id)
  values
    ('88888888-8888-8888-8888-888888888801', boyang_id),
    ('88888888-8888-8888-8888-888888888801', zhongyang_id),
    ('88888888-8888-8888-8888-888888888801', shuyang_id),
    ('88888888-8888-8888-8888-888888888802', boyang_id),
    ('88888888-8888-8888-8888-888888888803', zhongyang_id),
    ('88888888-8888-8888-8888-888888888804', shuyang_id),
    ('88888888-8888-8888-8888-888888888805', boyang_id),
    ('88888888-8888-8888-8888-888888888805', zhongyang_id),
    ('88888888-8888-8888-8888-888888888805', shuyang_id)
  on conflict do nothing;

  insert into public.education_goals (id, family_id, child_id, title, subject, target_date, status, progress, created_by)
  values
    (goal_boyang_id, target_family_id, boyang_id, '建立小升初衔接节奏', '综合规划', '2026-11-30', 'in_progress', 58, owner_user_id),
    (goal_zhongyang_id, target_family_id, zhongyang_id, '形成五年级前的自主学习习惯', '习惯培养', '2026-09-30', 'in_progress', 46, owner_user_id),
    (goal_shuyang_id, target_family_id, shuyang_id, '完成二年级学习流程衔接', '启蒙衔接', '2026-08-31', 'planned', 32, owner_user_id)
  on conflict (id) do update set
    title = excluded.title,
    subject = excluded.subject,
    target_date = excluded.target_date,
    status = excluded.status,
    progress = excluded.progress,
    updated_at = now();

  delete from public.resources
  where family_id = target_family_id
    and title in (
      '伯杨：小升初衔接观察记录',
      '仲杨：阅读复述模板',
      '叔杨：拼读练习包',
      '家庭教育周复盘模板'
    );

  insert into public.resources (family_id, child_id, kind, title, subject, tags, created_by)
  values
    (target_family_id, boyang_id, 'note', '伯杨：小升初衔接观察记录', '规划', array['升学', '复盘', '数学'], owner_user_id),
    (target_family_id, zhongyang_id, 'worksheet', '仲杨：阅读复述模板', '阅读', array['阅读', '习惯', '表达'], owner_user_id),
    (target_family_id, shuyang_id, 'worksheet', '叔杨：拼读练习包', '拼读', array['启蒙', '拼读', '游戏'], owner_user_id),
    (target_family_id, null, 'note', '家庭教育周复盘模板', '家庭管理', array['周复盘', '家长', '路线图'], owner_user_id);
end $$;
