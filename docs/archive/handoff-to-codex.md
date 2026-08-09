# 交接文档：移交给 codex 的剩余上线工作

> 编写日期：2026-08-04。本文档所有结论均基于当日对仓库 main 分支（HEAD = `bf1154c`）的实际核查（git log、文件通读、实际运行测试/类型检查/lint），非凭印象撰写。

---

## 1. 项目是什么

私有家庭教育三孩管理应用：一个无登录、访问码鉴权的家庭内部 PWA，用于管理三个孩子的日程、学习记录/成绩、成长计划、学习资料与家教反馈。

- **技术栈**：Next.js 15（App Router）+ React 19 + TypeScript 5.7 + Tailwind CSS 3.4 + Supabase（`@supabase/supabase-js`）+ Zod + SWR。Node 22（`package.json` engines 声明）。
- **两种数据模式**（由 `NEXT_PUBLIC_FAMILY_DATA_MODE` 决定，判定逻辑在 `src/lib/family-data-mode.ts`，刻意不依赖 NODE_ENV）：
  - `local`：demo 数据 + 浏览器 localStorage，不连 Supabase；
  - `private-api`：生产模式，数据经 `/api/private/*` 路由读写 Supabase，服务端签发短时 JWT（携带 `family_id` / `access_role` claims）走 RLS，而非用 service_role 绕过 RLS。
- **访问码鉴权机制**（`src/lib/private-access.ts`）：四种角色访问码（parent / caregiver / tutor / viewer，环境变量配置，未配置的角色不可登录）；会话为 HMAC 签名 cookie（`PRIVATE_SESSION_SECRET` 签名，30 天 TTL、每次访问刷新）；家教通过带签名的邀请链接进入（90 天 TTL，scope 绑定到具体孩子+科目，可撤销——撤销记录在 `revoked_tokens` 表）；`/api/access` 有基于 `access_attempts` 表的跨实例限流（10 分钟窗口 8 次失败）。

## 2. 当前状态（2026-08-04 核查）

- **main 最新提交**：`bf1154c docs: add paste-ready read-only Supabase inventory SQL for manual SQL Editor audit`，本地与 origin/main 一致（已推送）。
- **近期已完成的工作**（git log 逐条核对）：
  - 文案定稿：`096e037` / `39e568b` / `28418fe` / `c27637c` 按评审报告逐节重写了访问页、侧栏、记录、家教反馈、今天/日程、设置等页面文案，**已定稿**；
  - 死代码清理：`d19f8eb` 移除未使用导出与孤立的 supabase browser client；
  - 部署准备包：`4b29f21` 新增 `docs/deployment-guide.md`（Supabase+Vercel 全流程）、给删表迁移加内置备份与配套回滚文件、修正 `.env.example`；
  - 验收材料：`4047e5b` 家长手工验收清单（`docs/manual-acceptance-checklist.md`）；
  - 只读盘点 SQL：`bf1154c` 新增 `docs/supabase-inventory-check.sql`（见任务 A）。
- **测试 / 类型 / lint 状态**（2026-08-04 在 HEAD=bf1154c 上实际运行）：

  | 检查 | 命令 | 结果 |
  | --- | --- | --- |
  | 单元测试 | `npm test` | 34 pass / 0 fail |
  | 类型检查 | `npx tsc --noEmit`（即 `npm run typecheck`） | 0 错误 |
  | Lint | `npx eslint .`（即 `npm run lint`） | 0 问题 |
  | 构建 | `npm run build` | 本次未重跑（本机 `.next` 正被验收服务占用，见下），private-api 模式构建此前已在独立目录验证通过（22 条路由，详见 `docs/deployment-guide.md`「已确认没问题的项」表） |

  ⚠️ 用户本机 localhost:3000 有一个正在使用的验收服务（生产构建、local 模式）。**在用户本机操作时不要运行 `npm run build` / 删 `.next`**，会打断验收；CI 或其他环境不受此限。
- **数据库现状**：尚未有任何已确认的 Supabase 真实状态信息。此前排查确认本机无任何 Supabase 凭据（无 `.env.local`、CLI 未登录），用户选择自己在 Dashboard SQL Editor 手动跑盘点 SQL——结果尚未回贴，这就是任务 A。

## 3. 剩余三件事

### A. Supabase 只读盘点

- **目标**：搞清用户 Supabase 库的真实状态——建了哪些表、各表行数、RLS 是否启用、六个迁移哪些已执行、`learning-materials` 桶是否存在。
- **做法**：让用户把 `docs/supabase-inventory-check.sql` 整个粘贴进 Supabase Dashboard → SQL Editor 执行（该文件是**单条 SELECT**，纯只读，9 个分区共用一张结果表），把结果贴回来；对照文件末尾的「预期结果对照」注释（全新库 vs 老库 vs 删表判定）出结论。
- **依赖文件**：`docs/supabase-inventory-check.sql`（盘点 SQL 本体 + 判读指南）、`docs/private-supabase-schema.sql`（期望的 12 张基础表基线）、`docs/migrations/`（期望的迁移指纹）。
- **验收标准**：能明确回答三个问题——① 14 张期望表（12 基础 + `revoked_tokens` + `access_attempts`）齐不齐；② 6 个迁移各自 APPLIED/NOT APPLIED；③ `self_evaluations` / `child_intake_profiles` 存在与否及行数。结论写成一份盘点报告（建议 `docs/supabase-inventory-<日期>.md`）。

### B. 删表迁移判定与执行

- **目标**：决定 `docs/migrations/2026-07-23-drop-retired-tables.sql`（删除已下线的 `self_evaluations` 自评表与 `child_intake_profiles` 入学档案表）是否执行，并在需要时安全执行。
- **判定规则**（依据任务 A 盘点结果，规则同 `supabase-inventory-check.sql` 末尾 C 段）：
  - 两张待删表**都不存在** → **不要执行**（全新库本来就没有这两张表；执行会因备份语句找不到源表而报错）。`docs/deployment-guide.md` 步骤 1.2 也明确警告了这一点；
  - 表存在且**有数据** → 需执行；执行前先在 Table Editor 导出两张表 CSV 做库外备份（迁移文件头部有说明），迁移本身也会先建 `*_backup_20260728` 库内备份表再 DROP；
  - 表存在但**0 行** → 需执行（清理结构），CSV 备份可省，直接跑；
  - 只存在一张 → 状态异常，停下来人工确认。
- **依赖文件**：`docs/migrations/2026-07-23-drop-retired-tables.sql`（迁移本体，内置备份）、`docs/migrations/2026-07-23-drop-retired-tables-rollback.sql`（从备份表恢复数据的回滚，注意只恢复数据不恢复约束/RLS，见其头部注释）。
- **验收标准**：执行后重跑盘点 SQL 的 03 区——两张待删表「不存在」、两张备份表「存在」且行数与删除前一致；应用功能不受影响（这两张表已无任何路由读写）。**执行前必须拿到用户明确确认**（见红线）。

### C. 部署到 Vercel

- **目标**：以 `private-api` 模式完成首次真实部署（项目至今只在本地 local 模式验证过）。
- **做法**：严格按 `docs/deployment-guide.md` 走：步骤 1 建 Supabase 项目并按顺序执行 7 个 SQL 文件（若任务 A 盘点发现部分已执行，跳过已执行的）→ 步骤 2 配 8 个必填环境变量 → 步骤 3 Vercel 导入部署 → 步骤 4 逐条跑部署后验证清单（curl 命令 + 浏览器 + iPhone PWA/日历订阅）。指南的「已知风险与坑」11 条务必先通读。
- **必须由用户本人提供的凭据清单**（codex 不应自己生成或猜测）：
  1. Supabase 账号（用户自己注册、自己建项目）；
  2. Vercel 账号（用户自己注册并授权 GitHub 仓库）;
  3. 四个 Supabase 密钥：Project URL、anon key、service_role key、JWT Secret（均在用户自己的 Dashboard → Settings → API）；
  4. 家长访问码（用户自定强口令，≥12 位；可选：看护人/家教/只读访问码）；
  5. `PRIVATE_SESSION_SECRET`（用户本机跑 `npm run private:secrets` 生成）；
  6. 三个孩子的真实资料（改写 `docs/private-pilot-seed-template.sql`，或部署后在应用内补录）；
  7. （可选）自有域名。
- **验收标准**：`docs/deployment-guide.md` 步骤 4 全部通过，重点：`/` 未登录 307 到 `/access`；登录后 `/api/health` 返回 `"readyForPrivateDeploy": true` 且 checks 全 true；新增学习记录刷新后仍在且 Supabase 表里可见；错误访问码 8 次后限流；家教邀请链接生成/撤销闭环生效；iOS 日历订阅出 ICS。

## 4. 红线约束

1. **数据库任何写操作（含执行迁移、删表、改 seed）必须先拿到用户明确确认**才能执行；盘点用的 `supabase-inventory-check.sql` 是唯一预授权的只读例外。
2. **不要 force push**；推送前先 `git status` / `git log origin/main..HEAD` 核对。
3. **文案已定稿**（commits `096e037`→`c27637c` 的评审重写成果），不要再改任何用户可见文案，除非用户提出。
4. **不要提交任何真实密钥**：仓库内只允许 `.env.example` 的占位符；`.env.local` 永不入库；任何报告/commit message/日志里不得出现密钥明文，也不得出现具体家庭数据行内容（隐私）。
5. **改动需保证四项全绿后才可提交**：`npm test`、`npm run typecheck`（tsc --noEmit）、`npm run lint`（eslint .）、`npm run build`。（在用户本机跑 build 前先确认验收服务已停止，见第 2 节警告。）

## 5. 关键文件索引

| 路径 | 用途 |
| --- | --- |
| `docs/deployment-guide.md` | Supabase+Vercel 首次部署完整手册：SQL 执行顺序、全部环境变量清单、部署后验证、11 条已知坑、回滚方案 |
| `docs/supabase-inventory-check.sql` | paste-ready 只读盘点 SQL（单条 SELECT、9 分区），末尾附全新库/老库/删表判定的预期结果对照 |
| `docs/migrations/` | 6 个手动迁移文件（3 个 2026-07-17 加列迁移、2026-07-22 token 安全表、2026-07-23 删表及其 rollback）；均在 SQL Editor 手动执行，无 CLI 迁移记录 |
| `docs/manual-acceptance-checklist.md` | 家长手工验收清单（按页面逐条打勾，当前针对本机 localhost 验收） |
| `docs/private-supabase-schema.sql` | private-api 模式的数据库基线：12 张业务表、索引、触发器、RLS 策略、6 个安全函数 |
| `docs/private-supabase-storage.sql` | `learning-materials` 私有存储桶 + storage.objects 的 3 条 RLS 策略 |
| `docs/private-pilot-seed-template.sql` | 种子数据模板（家庭 + 三个孩子），幂等可重跑；家庭 UUID 必须与 `NEXT_PUBLIC_PRIVATE_FAMILY_ID` 一致 |
| `.env.example` | 全部环境变量的注释版清单（与代码实际读取的变量一致，deployment-guide 已穷举核对） |
| `src/lib/family-data-mode.ts` | local / private-api 模式判定（仅看 `NEXT_PUBLIC_FAMILY_DATA_MODE`，不看 NODE_ENV） |
| `src/lib/private-access.ts` | 鉴权核心：访问码→角色、HMAC 会话签名、家教邀请 token 签发/校验、TTL 定义 |
| `src/app/api/private/` | private-api 模式的全部数据读写路由（服务端签 JWT 走 RLS） |
| `docs/database-schema.sql` | ⚠️ 早期多租户 SaaS 设计稿，**不要执行**（deployment-guide 步骤 1.2 有同样警告） |
| `tests/core/` | 34 个单元测试（鉴权、中间件、限流、urgency 等），`npm test` 运行 |
