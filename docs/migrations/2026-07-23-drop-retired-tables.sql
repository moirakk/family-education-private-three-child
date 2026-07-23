-- Migration: drop retired tables (2026-07-23)
--
-- ⚠️ 警告：执行本迁移会**永久删除** self_evaluations（孩子自评）与
-- child_intake_profiles（入学档案）两张表及其中的全部历史数据。
-- 如需保留历史记录，请先在 Supabase Dashboard（Table Editor → Export）
-- 或通过 /api/private/export 导出备份，再执行本文件。
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

begin;

drop table if exists public.self_evaluations cascade;
drop table if exists public.child_intake_profiles cascade;

commit;
