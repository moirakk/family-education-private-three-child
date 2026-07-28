-- Migration: drop retired tables (2026-07-23, revised 2026-07-28 to add in-database backups)
--
-- ⚠️ 这是破坏性操作：会删除 self_evaluations（孩子自评）与
-- child_intake_profiles（入学档案）两张表。
--
-- 适用范围：只对 2026-07-23 之前建库、仍存在这两张表的老数据库执行。
-- 全新部署（用当前 docs/private-supabase-schema.sql 建库）不包含这两张表，
-- 无需也无法执行本文件（备份语句会因源表不存在而报错）。
--
-- 执行前请务必：
--   1. 在 Supabase Dashboard（Table Editor → 选中表 → Export → CSV）
--      导出这两张表的数据到本地，作为数据库外的第二重备份。
--   2. 然后再执行本文件。
--
-- 本文件在 DROP 之前会先把两张表完整复制为备份表：
--   * self_evaluations_backup_20260728
--   * child_intake_profiles_backup_20260728
-- 因此操作可回滚：如需恢复，执行同目录下
-- 2026-07-23-drop-retired-tables-rollback.sql。
-- 确认无误、不再需要历史数据后，可手动删除这两张备份表：
--   drop table if exists public.self_evaluations_backup_20260728;
--   drop table if exists public.child_intake_profiles_backup_20260728;
--
-- 背景：这两个功能已从应用中下线（自评模块、入学档案模块已删除），
-- 表不再被任何路由读写。用户已确认删除。
--
-- 说明：drop table ... cascade 会一并清理依赖对象——
--   * RLS 策略："self evaluations select member" / "self evaluations write editor"
--     "intake select member" / "intake write editor"
--   * 触发器：set_self_evaluations_updated_at / set_child_intake_profiles_updated_at
--   * 索引：self_evaluations_child_date_idx（child_intake_profiles 无附加索引）
--   * 表级 GRANT（授予 authenticated 的权限随表删除自动消失）
-- 共享函数 public.set_updated_at / is_family_member / can_edit_family
-- 仍被其他表使用，保留不动。
--
-- 注意：CREATE TABLE ... AS SELECT 只复制数据，不复制约束/索引/RLS。
-- 备份表未启用 RLS，但只有 postgres/service_role 能访问（未 GRANT 给
-- authenticated/anon），普通请求无法读取。

begin;

-- 备份（DROP 之前执行，保证可回滚）
create table if not exists public.self_evaluations_backup_20260728 as
  select * from public.self_evaluations;
create table if not exists public.child_intake_profiles_backup_20260728 as
  select * from public.child_intake_profiles;

drop table if exists public.self_evaluations cascade;
drop table if exists public.child_intake_profiles cascade;

commit;
