-- ============================================================================
-- Supabase 只读盘点 SQL（paste-ready，2026-07-28）
-- ============================================================================
-- 用途：在 Supabase Dashboard → SQL Editor 中一次性粘贴执行，
--       盘点数据库真实状态，把结果贴回给开发方即可。
--
-- 安全性：整个文件只有一条 SELECT 语句（多段 UNION ALL 拼成一个结果集），
--         纯只读，不含任何 DDL/DML（无 INSERT/UPDATE/DELETE/DROP/ALTER/
--         CREATE/TRUNCATE/GRANT），不会对数据库做任何修改。
--
-- 为什么拼成一条语句：Supabase SQL Editor 粘贴多条语句时只显示最后一条的
-- 结果。拼成单条 SELECT 后，所有盘点结果会出现在同一张结果表里，
-- 按 section 列分组阅读即可。
--
-- 结果列说明：
--   section : 盘点分区（01~09，见下方各段注释）
--   item    : 对象名（表名/迁移文件名/策略名/bucket 名等）
--   detail  : 对照说明或标记
--   value   : 数值/状态（行数、策略数、APPLIED/NOT APPLIED 等）
--
-- 行数统计说明：使用 query_to_xml 对每张表执行真实的 count(*)（精确值，
-- 非 pg_class.reltuples 估算）。该函数只执行内部给定的 count 查询，只读。
-- ============================================================================

select section, item, detail, value
from (

  -- --------------------------------------------------------------------------
  -- 01. public schema 现有表清单 + 每表精确行数 + 与 docs schema 的对照
  --     期望表来源：
  --       * docs/private-supabase-schema.sql（12 张基础业务表）
  --       * docs/migrations/2026-07-22-token-security.sql（2 张安全表）
  --     另标记：已下线待删表、删表迁移产生的备份表、docs 中未定义的多余表
  -- --------------------------------------------------------------------------
  select
    '01_tables_and_rowcounts' as section,
    t.tablename as item,
    case
      when t.tablename in (
        'families', 'family_settings', 'family_members', 'children',
        'calendar_events', 'calendar_event_children', 'learning_records',
        'education_goals', 'milestones', 'resources', 'learning_materials',
        'tutor_feedback'
      ) then '期望存在（基础 schema）'
      when t.tablename in ('revoked_tokens', 'access_attempts')
        then '期望存在（2026-07-22 token-security 迁移）'
      when t.tablename in ('self_evaluations', 'child_intake_profiles')
        then '已下线待删表（drop-retired-tables 迁移的目标）'
      when t.tablename like '%\_backup\_20260728' escape '\'
        then '删表迁移产生的备份表'
      else '多余表：docs schema 中未定义 ⚠️'
    end as detail,
    coalesce(
      (xpath('/row/cnt/text()',
        query_to_xml(
          format('select count(*) as cnt from %I.%I', t.schemaname, t.tablename),
          false, true, ''
        )))[1]::text,
      '0'
    ) || ' 行' as value
  from pg_tables t
  where t.schemaname = 'public'

  union all

  -- --------------------------------------------------------------------------
  -- 02. 缺失表：docs 里定义了、但数据库里不存在的表
  -- --------------------------------------------------------------------------
  select
    '02_missing_expected_tables',
    e.tablename,
    case e.src
      when 'base' then '缺失：基础 schema 定义但库中不存在 ❌'
      else '缺失：token-security 迁移定义但库中不存在 ❌'
    end,
    'absent'
  from (values
    ('families', 'base'), ('family_settings', 'base'), ('family_members', 'base'),
    ('children', 'base'), ('calendar_events', 'base'),
    ('calendar_event_children', 'base'), ('learning_records', 'base'),
    ('education_goals', 'base'), ('milestones', 'base'), ('resources', 'base'),
    ('learning_materials', 'base'), ('tutor_feedback', 'base'),
    ('revoked_tokens', 'migration'), ('access_attempts', 'migration')
  ) as e(tablename, src)
  where not exists (
    select 1 from pg_tables t
    where t.schemaname = 'public' and t.tablename = e.tablename
  )

  union all

  -- --------------------------------------------------------------------------
  -- 03. 待删表现状：self_evaluations / child_intake_profiles 是否存在、行数，
  --     以及删表迁移的备份表是否已存在
  -- --------------------------------------------------------------------------
  select
    '03_retired_tables_status',
    x.tbl,
    case
      when exists (select 1 from pg_tables
                   where schemaname = 'public' and tablename = x.tbl)
        then '存在'
      else '不存在'
    end,
    case
      when exists (select 1 from pg_tables
                   where schemaname = 'public' and tablename = x.tbl)
        then coalesce(
          (xpath('/row/cnt/text()',
            query_to_xml(
              format('select count(*) as cnt from public.%I', x.tbl),
              false, true, ''
            )))[1]::text, '0') || ' 行'
      else 'n/a'
    end
  from (values
    ('self_evaluations'),
    ('child_intake_profiles'),
    ('self_evaluations_backup_20260728'),
    ('child_intake_profiles_backup_20260728')
  ) as x(tbl)

  union all

  -- --------------------------------------------------------------------------
  -- 04. 迁移执行进度：通过列/表/枚举值是否存在来推断每个迁移文件是否已执行
  --     （本项目迁移是在 SQL Editor 手动执行的，没有 CLI 迁移记录表，
  --       只能用结构指纹推断；指纹与 docs/migrations/ 下各文件一一对应）
  -- --------------------------------------------------------------------------
  select
    '04_migration_progress',
    '2026-07-17-calendar-rules.sql',
    '指纹：calendar_events.recurrence_end + all_day 两列',
    case (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'calendar_events'
            and column_name in ('recurrence_end', 'all_day'))
      when 2 then 'APPLIED ✅（或已随新版基础 schema 建库）'
      when 0 then case
        when exists (select 1 from pg_tables
                     where schemaname = 'public' and tablename = 'calendar_events')
          then 'NOT APPLIED ❌'
        else 'N/A：calendar_events 表不存在（基础 schema 未执行）'
      end
      else 'PARTIAL ⚠️（两列只存在其一）'
    end

  union all

  select
    '04_migration_progress',
    '2026-07-17-growth-plans.sql (1/2)',
    '指纹：education_goals.plan_type + custom_type + sync_to_calendar 三列',
    case (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'education_goals'
            and column_name in ('plan_type', 'custom_type', 'sync_to_calendar'))
      when 3 then 'APPLIED ✅（或已随新版基础 schema 建库）'
      when 0 then case
        when exists (select 1 from pg_tables
                     where schemaname = 'public' and tablename = 'education_goals')
          then 'NOT APPLIED ❌'
        else 'N/A：education_goals 表不存在（基础 schema 未执行）'
      end
      else 'PARTIAL ⚠️'
    end

  union all

  select
    '04_migration_progress',
    '2026-07-17-growth-plans.sql (2/2)',
    '指纹：roadmap_status 枚举含 cancelled 值',
    case
      when not exists (select 1 from pg_type ty
                       join pg_namespace n on n.oid = ty.typnamespace
                       where n.nspname = 'public' and ty.typname = 'roadmap_status')
        then 'N/A：roadmap_status 枚举不存在（基础 schema 未执行）'
      when exists (select 1 from pg_enum e
                   join pg_type ty on ty.oid = e.enumtypid
                   join pg_namespace n on n.oid = ty.typnamespace
                   where n.nspname = 'public' and ty.typname = 'roadmap_status'
                     and e.enumlabel = 'cancelled')
        then 'APPLIED ✅'
      else 'NOT APPLIED ❌（注意：新版基础 schema 也不含 cancelled，全新库需补跑此迁移的第 1 行）'
    end

  union all

  select
    '04_migration_progress',
    '2026-07-17-score-records.sql',
    '指纹：learning_records.max_score + exam_type 两列',
    case (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'learning_records'
            and column_name in ('max_score', 'exam_type'))
      when 2 then 'APPLIED ✅（或已随新版基础 schema 建库）'
      when 0 then case
        when exists (select 1 from pg_tables
                     where schemaname = 'public' and tablename = 'learning_records')
          then 'NOT APPLIED ❌'
        else 'N/A：learning_records 表不存在（基础 schema 未执行）'
      end
      else 'PARTIAL ⚠️'
    end

  union all

  select
    '04_migration_progress',
    '2026-07-22-token-security.sql',
    '指纹：revoked_tokens + access_attempts 两张表',
    case (select count(*) from pg_tables
          where schemaname = 'public'
            and tablename in ('revoked_tokens', 'access_attempts'))
      when 2 then 'APPLIED ✅'
      when 0 then 'NOT APPLIED ❌（此迁移不含在基础 schema 内，必须单独执行）'
      else 'PARTIAL ⚠️（两表只建了一张）'
    end

  union all

  select
    '04_migration_progress',
    '2026-07-23-drop-retired-tables.sql',
    '指纹：self_evaluations 与 child_intake_profiles 已不存在',
    case (select count(*) from pg_tables
          where schemaname = 'public'
            and tablename in ('self_evaluations', 'child_intake_profiles'))
      when 0 then '已完成或无需执行 ✅（两张待删表都不存在；若也没有 backup 表则说明是全新库，本来就无需执行）'
      when 2 then 'NOT APPLIED ❌（两张待删表都还在，删表迁移待执行——先看 03 区的行数决定备份价值）'
      else 'PARTIAL ⚠️（只删了一张，状态异常，需人工确认）'
    end

  union all

  -- --------------------------------------------------------------------------
  -- 05. CLI 迁移记录表（supabase_migrations.schema_migrations）
  --     本项目迁移走 SQL Editor 手动执行，正常情况下该表不存在；
  --     若存在（用过 supabase db push），value 里会列出已记录的版本号
  -- --------------------------------------------------------------------------
  select
    '05_cli_migration_history',
    'supabase_migrations.schema_migrations',
    case
      when exists (select 1 from information_schema.tables
                   where table_schema = 'supabase_migrations'
                     and table_name = 'schema_migrations')
        then '存在（用过 supabase CLI 管理迁移）'
      else '不存在（迁移均为 SQL Editor 手动执行，属预期情况）'
    end,
    case
      when exists (select 1 from information_schema.tables
                   where table_schema = 'supabase_migrations'
                     and table_name = 'schema_migrations')
        then coalesce(
          (xpath('/row/v/text()',
            query_to_xml(
              'select string_agg(version, '', '' order by version) as v from supabase_migrations.schema_migrations',
              false, true, ''
            )))[1]::text,
          '（表存在但无记录）')
      else 'n/a'
    end

  union all

  -- --------------------------------------------------------------------------
  -- 06. RLS 启用状态：public schema 每张表是否启用 RLS + 策略数量
  --     注意：revoked_tokens / access_attempts 设计为"RLS 启用 + 0 策略"
  --     （仅 service_role 访问），0 策略对这两张表是正常的；
  --     备份表（*_backup_20260728）未启用 RLS 但未授权给 anon/authenticated，
  --     也属预期。其余业务表若 RLS DISABLED 或 0 策略则为异常 ⚠️
  -- --------------------------------------------------------------------------
  select
    '06_rls_status',
    t.tablename,
    case when t.rowsecurity then 'RLS ENABLED ✅' else 'RLS DISABLED ⚠️' end,
    (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = t.tablename)::text || ' 条策略'
  from pg_tables t
  where t.schemaname = 'public'

  union all

  -- --------------------------------------------------------------------------
  -- 07. RLS 策略清单：public + storage 两个 schema 的全部策略
  --     （storage.objects 上应有 3 条 learning materials 策略，
  --       来自 docs/private-supabase-storage.sql）
  -- --------------------------------------------------------------------------
  select
    '07_rls_policies',
    p.schemaname || '.' || p.tablename,
    p.policyname,
    p.cmd || ' / roles=' || array_to_string(p.roles, ',')
  from pg_policies p
  where p.schemaname in ('public', 'storage')

  union all

  -- --------------------------------------------------------------------------
  -- 08. Storage bucket 清单
  --     期望：learning-materials（private，50MB 上限，
  --     来自 docs/private-supabase-storage.sql）
  -- --------------------------------------------------------------------------
  select
    '08_storage_buckets',
    b.id,
    case
      when b.id = 'learning-materials' and b.public = false
        then '期望的私有 bucket ✅'
      when b.id = 'learning-materials' and b.public = true
        then 'learning-materials 被设成了 public ⚠️（应为 private）'
      else 'docs 中未定义的 bucket'
    end,
    'public=' || b.public::text
      || ', size_limit=' || coalesce(b.file_size_limit::text, '无限制')
  from storage.buckets b

  union all

  select
    '08_storage_buckets',
    'learning-materials',
    'bucket 缺失：docs/private-supabase-storage.sql 尚未执行 ❌',
    'absent'
  where not exists (select 1 from storage.buckets where id = 'learning-materials')

  union all

  -- --------------------------------------------------------------------------
  -- 09. 关键函数存在性：基础 schema 定义的 6 个函数
  --     （RLS 策略与日历订阅 feed 都依赖它们）
  -- --------------------------------------------------------------------------
  select
    '09_expected_functions',
    f.fname,
    case
      when exists (select 1 from pg_proc p
                   join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname = f.fname)
        then '存在 ✅'
      else '缺失 ❌（基础 schema 未完整执行）'
    end,
    coalesce(
      (select 'security definer=' || p.prosecdef::text
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = f.fname
       limit 1),
      'n/a')
  from (values
    ('set_updated_at'),
    ('is_family_member'),
    ('can_edit_family'),
    ('is_scoped_tutor_for_child'),
    ('get_calendar_family_id_by_token'),
    ('get_calendar_feed_by_token')
  ) as f(fname)

) inventory
order by section, item;

-- ============================================================================
-- 预期结果对照（人工判读指南）
-- ============================================================================
--
-- 【A. 全新库（用当前 docs/private-supabase-schema.sql +
--       private-supabase-storage.sql + token-security 迁移建库）应看到】
--   01 区：恰好 14 张表——12 张基础业务表 + revoked_tokens + access_attempts，
--          无"已下线待删表"、无"备份表"、无"多余表"；行数取决于是否跑过
--          docs/private-pilot-seed-template.sql（跑过则 families=1、children=3 等，
--          没跑则全部 0 行）。
--   02 区：空（没有缺失表）。
--   03 区：四行全部"不存在 / n/a"。
--   04 区：calendar-rules、growth-plans(1/2)、score-records 显示 APPLIED ✅
--          （新版基础 schema 已内置这些列）；growth-plans(2/2) 的 cancelled
--          枚举值大概率 NOT APPLIED ❌——基础 schema 的枚举定义不含 cancelled，
--          全新库需要单独补跑该迁移文件的第 1 行（alter type ... add value）；
--          token-security 取决于是否单独执行过；
--          drop-retired-tables 显示"已完成或无需执行 ✅"。
--   06 区：14 张表全部 RLS ENABLED ✅；revoked_tokens / access_attempts 为
--          0 条策略（设计如此），其余 12 张表各有 1~3 条策略。
--   07 区：public 下约 25 条策略 + storage.objects 下 3 条
--          "learning materials objects ..." 策略。
--   08 区：learning-materials，public=false，size_limit=52428800。
--   09 区：6 个函数全部"存在 ✅"。
--
-- 【B. 老库（2026-07-23 之前按旧版 schema 建库）可能看到】
--   01 区：额外出现 self_evaluations / child_intake_profiles
--          （标记为"已下线待删表"）；若某些列迁移没跑过，
--          04 区对应条目显示 NOT APPLIED ❌。
--   03 区：两张待删表"存在"并显示行数；执行过删表迁移的话
--          还会看到两张 *_backup_20260728 备份表。
--   04 区：逐条对照，NOT APPLIED ❌ 的迁移需要按文件日期顺序补跑
--          （补跑前另行确认，本文件不做任何修改）。
--
-- 【C. 删表迁移（2026-07-23-drop-retired-tables.sql）是否需要执行的判定】
--   * 03 区两张待删表都"不存在"        → 无需执行（也无法执行，
--     其内部备份语句会因源表不存在而报错）。全新库即此情况。
--   * 待删表"存在"且行数 > 0            → 需要执行；先按迁移文件头部说明
--     从 Table Editor 导出 CSV 做库外备份，再执行。
--   * 待删表"存在"但行数 = 0            → 需要执行（清理结构）；
--     CSV 备份意义不大，但迁移内置的备份表机制照常生效，直接执行即可。
--   * 只存在一张待删表                   → 状态异常 ⚠️，先人工确认再操作。
--
-- 【D. private-api 模式可用性判定】
--   必须满足：02 区为空（14 张表齐全）+ 06 区业务表全部 RLS ENABLED 且
--   有策略 + 08 区 learning-materials bucket 存在且 private + 09 区 6 个
--   函数齐全 + 04 区 token-security 为 APPLIED ✅。
--   缺什么，就补跑 docs/ 下对应的 schema/storage/迁移文件（另行操作）。
-- ============================================================================
