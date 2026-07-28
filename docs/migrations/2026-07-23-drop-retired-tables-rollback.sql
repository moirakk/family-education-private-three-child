-- Rollback: restore retired tables from in-database backups
-- 对应迁移：2026-07-23-drop-retired-tables.sql
--
-- 使用场景：执行了 drop-retired-tables 之后发现仍需要
-- self_evaluations / child_intake_profiles 的历史数据。
--
-- ⚠️ 注意与限制：
--   1. 本回滚只恢复**数据**（从备份表整表复制回来）。
--      原表的主键、外键、索引、触发器、RLS 策略不会自动恢复——
--      CREATE TABLE ... AS SELECT 制作的备份不包含这些对象。
--   2. 恢复后的表默认未启用 RLS，且未 GRANT 给 authenticated/anon，
--      因此只有 service_role 能访问。当前代码已不读写这两张表，
--      这通常正是你想要的（仅为查阅历史数据）。
--   3. 如果要让应用重新使用这两张表，需要从 git 历史中找回
--      docs/private-supabase-schema.sql 删除这两张表定义之前的版本
--      （含约束、触发器、RLS 策略），按原始 DDL 重建后再导入数据。
--   4. 本文件可重复执行（restore 前先 drop 已存在的同名表）。
--
-- 前提：备份表 self_evaluations_backup_20260728 /
-- child_intake_profiles_backup_20260728 仍然存在（尚未手动删除）。

begin;

drop table if exists public.self_evaluations;
create table public.self_evaluations as
  select * from public.self_evaluations_backup_20260728;

drop table if exists public.child_intake_profiles;
create table public.child_intake_profiles as
  select * from public.child_intake_profiles_backup_20260728;

commit;

-- 确认数据恢复无误后，备份表可保留也可手动清理：
--   drop table if exists public.self_evaluations_backup_20260728;
--   drop table if exists public.child_intake_profiles_backup_20260728;
