# Family Education Management System 私用版当前审查包

> 用途：把这份文档发给 Claude，请它继续做代码级安全、手机端 UI、长期稳定性审查。不要附带 `.env.local`、Supabase secret、访问码、calendar token 或任何真实家庭隐私数据。

## 1. 当前目标

我们正在做一个给单个三孩家庭长期使用的私有教育管理系统。

- 孩子 1：马上升初一
- 孩子 2：马上升五年级
- 孩子 3：马上升二年级
- 当前重点：私用定制版先稳定可用
- 暂不公开 GitHub
- 未来大众商业版会单独走 Supabase Auth、多租户、正式角色体系

当前产品不是展示 demo，而是要能长期记录：

- 日程和考试
- 学习记录
- 学习资料文件
- 孩子自我评价
- 家教反馈
- 教育路线图
- iOS 日历订阅
- JSON + Storage 备份恢复

## 2. 技术栈

- Next.js 15.5.19
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui 风格组件
- Supabase PostgreSQL
- Supabase Storage
- Vercel 目标部署
- iOS Calendar: ICS / webcal 单向订阅
- Node: `22.x`

## 3. 当前完成度

粗略完成度：

- 产品核心闭环：约 70%
- 数据库接入：约 75%
- 私有访问控制：约 70%
- 手机端信息架构：约 55%
- UI 精致度：约 45%
- 备份恢复：约 55%
- 可正式交给家长长期使用：约 60%

现在已经不是纯本机假数据 demo，核心模块可以走 Supabase 私有 API。

## 4. 已完成的核心架构

### 数据层

真实数据主要存储在 Supabase：

- PostgreSQL：结构化数据
- Supabase Storage：学习资料文件本体
- 数据库字段中的 `storage_path`：文件索引
- `family_settings.calendar_token`：iOS 日历订阅 token

主要表：

- `families`
- `family_settings`
- `children`
- `child_intake_profiles`
- `calendar_events`
- `calendar_event_children`
- `learning_records`
- `education_goals`
- `milestones`
- `resources`
- `learning_materials`
- `self_evaluations`
- `tutor_feedback`

### 访问控制

当前不是正式登录，而是访问码 + 签名 cookie：

- 家长 / 照护人：可进入完整 dashboard
- 家教：只能进入 `/tutor-feedback` 和有限 API
- viewer：角色存在，但目前不产品化，不能导出

Middleware 负责页面和 API 入口保护。
API route 内部继续做部分二次校验。

### 手机端信息架构

已经从“20 多个模块长页面”改成四模式：

- `today`：今天要做什么
- `week`：本周日程、周报、日历同步
- `records`：学习记录、资料库、自评、家教反馈、孩子档案、路线图
- `more`：补资料、导出、PWA、部署状态

桌面端：左侧模式切换栏。
手机端：底部 fixed tab bar。

## 5. 本轮刚完成的安全与稳定性补丁

请 Claude 重点审查以下文件。

### `src/lib/supabase-admin.ts`

已加入：

```ts
import "server-only";
```

目标：避免 service role 相关模块被 Client Component 间接引入。

### `src/middleware.ts`

私有 API 未授权时现在返回 JSON 403，而不是 HTML redirect：

```ts
return NextResponse.json({ error: "Private API requires an authorized access role." }, { status: 403 });
```

### `src/app/api/private/_utils.ts`

新增：

- `getAccessRoleFromRequest`
- `assertChildBelongsToFamily`
- `assertChildrenBelongToFamily`

目标：所有写入都验证孩子归属，避免 service role 绕过 RLS 后出现跨家庭写入风险。

### 已接入孩子归属校验的 API

- `src/app/api/private/events/route.ts`
- `src/app/api/private/learning-records/route.ts`
- `src/app/api/private/materials/route.ts`
- `src/app/api/private/roadmap/route.ts`
- `src/app/api/private/self-evaluations/route.ts`
- `src/app/api/private/tutor-feedback/route.ts`
- `src/app/api/private/intake/route.ts`

请检查是否还有 PUT / POST / DELETE 只按 `id` 操作、没有限定 `family_id` 或归属关系。

### `src/app/api/private/export/route.ts`

已做：

- `export const maxDuration = 60`
- 显式拒绝 `tutor` 和 `viewer`
- 仍然按 `familyId` 导出 13 张表

请检查：

- 是否所有导出表都限定了当前 `familyId`
- `family_settings.calendar_token` 是否会被完整导出用于灾难恢复
- 是否需要把 Storage 文件清单纳入 export manifest

### `src/app/api/private/tutor-context/route.ts`

生产环境不再静默回退 pilot 数据。

如果 `NEXT_PUBLIC_FAMILY_DATA_MODE !== "private-api"` 且在 production，会返回 500。

### `scripts/private-restore-backup.mjs`

恢复前新增 schema 检查：

- 如果表不存在，直接提示先跑 `docs/private-supabase-schema.sql`
- 避免恢复到一半才失败
- 可选 `--storage-manifest`，对照 `learning_materials.storage_path` 和 Storage 备份清单，提前发现文件本体缺失

## 6. 本轮刚完成的 UI / 手机端补丁

新增：

- `src/lib/child-theme.ts`
- `src/lib/urgency.ts`

接入：

- `src/components/dashboard/today-command-center.tsx`

效果：

- 三个孩子有统一颜色 token
- 今日提醒按紧急度排序
- 考试类近 2 天显示“重点”
- 一周内事项显示“本周”
- 今日工作台更接近任务导向，而不是模块展示

## 7. 当前验证结果

本地已通过：

```bash
npm run typecheck
npm run lint
npm run build
```

生产模式 smoke 已通过：

```bash
npm run private:smoke -- --base-url http://127.0.0.1:3000 --expect-ready --deep-private
```

通过项：

- health: ready=ok, mode=private-api
- access page
- manifest
- icon / apple icon
- service worker
- offline page
- private access login
- unauthenticated private API rejected
- protected dashboard
- tutor access boundaries
- calendar with session
- calendar token
- private export: 13 tables

## 8. 当前仍需重点审查的问题

### P0 / 上线前必须继续确认

1. `/api/access` 的限流目前仍是 cookie + 本机内存 best-effort，Vercel 多实例下内存限流不能完全依赖。是否要接 Upstash Redis？
2. 所有 DELETE / PUT 是否都同时限定 `family_id` 或做归属校验？
3. 家教角色是否只能提交反馈，不能读取导出、snapshot、完整 dashboard？
4. `viewer` 角色是否应该暂时完全禁用，避免半成品权限。
5. Service Worker 是否绝不缓存 `/api/*`、HTML dashboard、访问页和家教页。
6. Storage 文件备份与 JSON export 已有可选 manifest 一致性校验，请继续审查它是否足够覆盖真实恢复场景。

### P1 / 手机端体验

1. records 模式仍然很重，学习记录、资料上传、自评、家教反馈、孩子档案、路线图都在一个模式里。
2. 手机端表单仍偏桌面，建议做“快速录入”版本。
3. 资料上传在 iPhone 上需要实机验证：相册、文件 App、下载 signed URL。
4. 底部 tab 已有，但每个模式内部仍有较长滚动。
5. 三个孩子的颜色系统只接入了今日工作台，还需要贯穿日历、学习记录、资料库、路线图。

### P1 / 长期稳定性

1. 需要一次真实 Vercel 部署验证。
2. 需要一次真实 iPhone PWA 安装验证。
3. 需要一次真实 iOS Calendar webcal 订阅验证。
4. 需要一次完整灾难恢复演练：JSON export + Storage backup -> 全新 Supabase 项目。
5. 需要基础监控：Vercel logs + `/api/health` 定时 ping。

## 9. 希望 Claude 优先做什么

请 Claude 不要泛泛评价，优先做代码级审查：

1. 审查 `src/middleware.ts`、`src/lib/private-access.ts`、`src/app/api/access/route.ts`，判断访问码、cookie、CSRF、限流是否足够支撑私用版上线。
2. 审查 `src/app/api/private/*/route.ts`，列出所有可能缺少 `family_id`、孩子归属校验、角色校验的接口。
3. 审查 `public/sw.js`，确认不会缓存私有 API 或 dashboard HTML。
4. 审查手机端 UI 架构：`src/app/page.tsx`、`src/components/dashboard/app-shell.tsx`、`src/components/dashboard/today-command-center.tsx`，提出最小改动方案，让家长在 iPhone 上更好用。
5. 审查备份恢复脚本：`scripts/private-restore-backup.mjs`、`scripts/private-backup-storage.mjs`、`scripts/private-restore-storage.mjs`，判断多年后恢复是否可信。

## 10. 给 Claude 的一句话任务

请基于上述状态，重点从“今天能不能给家长长期试用”出发，做代码级上线前审查。请按 P0 / P1 / P2 输出：安全风险、数据可靠性、手机端体验、Vercel 部署风险，并尽量给具体文件和代码级修改建议。
