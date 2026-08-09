# 部署指南（Supabase + Vercel，private-api 模式）

> 写给第一次接触 Supabase 和 Vercel 的人。照着做即可，每一步都写明了在哪个页面、点哪个按钮、填什么值。
>
> 本指南对应代码版本：2026-08-09（main 分支）。当前生产环境已在 Vercel + Supabase private-api 模式下验证通过；本指南保留为首次部署、重建环境和排障时的完整准备包。

---

## 目录

1. [前置准备](#前置准备)
2. [步骤 1：创建 Supabase 项目并执行迁移](#步骤-1创建-supabase-项目并执行迁移)
3. [步骤 2：环境变量配置表（完整清单）](#步骤-2环境变量配置表完整清单)
4. [步骤 3：Vercel 部署步骤](#步骤-3vercel-部署步骤)
5. [步骤 4：部署后验证清单](#步骤-4部署后验证清单)
6. [已知风险与坑](#已知风险与坑)
7. [回滚方案](#回滚方案)
8. [还需要你提供什么](#还需要你提供什么)

---

## 前置准备

需要注册 / 准备的东西：

| 事项 | 说明 |
| --- | --- |
| GitHub 账号 | 代码仓库已在 GitHub 上；Vercel 通过 GitHub 授权拉代码 |
| Supabase 账号 | 到 [supabase.com](https://supabase.com) 用 GitHub 账号登录即可，免费档够用 |
| Vercel 账号 | 到 [vercel.com](https://vercel.com) 用 GitHub 账号登录即可，Hobby 免费档够用 |
| 本机 Node.js 22 | 仅本地生成密钥用（`node -v` 应显示 `v22.x`） |
| 决定好的访问码 | 至少一个「家长访问码」，建议 12 位以上、不易猜测（这是全家数据的门锁） |
| 三个孩子的真实资料 | 姓名、年龄、年级、学校等，用于改写种子 SQL（可以先用模板占位，部署后在应用里改） |

---

## 步骤 1：创建 Supabase 项目并执行迁移

### 1.1 创建项目

1. 登录 [supabase.com](https://supabase.com) → 点 **New project**。
2. 组织选默认；**Name** 填 `family-education`（随意）；**Database Password** 点 **Generate a password** 并**保存到密码管理器**（本项目代码不直接用它，但恢复/运维需要）。
3. **Region** 选 `Northeast Asia (Tokyo)`（家庭在东亚时区，延迟最低）。
4. 点 **Create new project**，等 1–2 分钟初始化完成。

### 1.2 执行 SQL（顺序很重要）

进入项目后，左侧栏点 **SQL Editor** → **New query**，把下面每个文件的内容**整个复制粘贴**进去，点 **Run**（或 Cmd+Enter）。**严格按此顺序，一个文件跑完确认无报错再跑下一个：**

| 顺序 | 文件 | 作用 | 预期结果 |
| --- | --- | --- | --- |
| 1 | `docs/private-supabase-schema.sql` | 建全部表、索引、触发器、RLS 策略、安全函数 | `Success. No rows returned` |
| 2 | `docs/migrations/2026-07-17-score-records.sql` | learning_records 加 `max_score` / `exam_type` 列 | `Success. No rows returned` |
| 3 | `docs/migrations/2026-07-17-growth-plans.sql` | education_goals 加 `plan_type` / `custom_type` / `sync_to_calendar` 列 | `Success. No rows returned` |
| 4 | `docs/migrations/2026-07-17-calendar-rules.sql` | calendar_events 加 `recurrence_end` / `all_day` 列 | `Success. No rows returned` |
| 5 | `docs/migrations/2026-07-22-token-security.sql` | 建 `revoked_tokens`（token 撤销）和 `access_attempts`（限流）表 | `Success. No rows returned` |
| 6 | `docs/private-supabase-storage.sql` | 创建 `learning-materials` 私有存储桶及其 RLS 策略 | `Success. No rows returned` |
| 7 | `docs/private-pilot-seed-template.sql` | 种子数据：家庭、三个孩子、初始目标（**先按 1.3 修改再执行**） | `Success. No rows returned` |

> **不要执行** `docs/migrations/2026-07-23-drop-retired-tables.sql`。
> 它只用于 2026-07-23 之前建的老库（删除已下线的两张表）。全新数据库里根本没有这两张表，执行会报错。
> 同理，`docs/database-schema.sql` 是早期多租户 SaaS 版设计稿，**不要执行**。

### 1.3 修改种子数据（执行第 7 步之前）

`docs/private-pilot-seed-template.sql` 里是占位内容。执行前把其中的孩子姓名、年龄、年级、学校、兴趣等改成真实值（直接在 SQL Editor 里粘贴后编辑再 Run 也可以）。

两个 UUID **不要改**（除非你知道自己在做什么）：

- `target_family_id = '11111111-1111-1111-1111-111111111111'` — 必须与环境变量 `NEXT_PUBLIC_PRIVATE_FAMILY_ID` 一致。
- 孩子 UUID（`2222...` / `3333...` / `4444...`）— 保持不变即可。

种子文件可重复执行（内置 `on conflict do update`），写错了改完重跑即可。

### 1.4 验证建表结果

左侧栏点 **Table Editor**，应能看到这些表：

`families, family_members, family_settings, children, calendar_events, calendar_event_children, learning_records, education_goals, milestones, tutor_feedback, learning_materials, revoked_tokens, access_attempts`

点开 `children` 表应能看到三个孩子的记录。左侧栏点 **Storage**，应能看到 `learning-materials` 桶（标记为 Private）。

### 1.5 收集密钥（后面配环境变量要用）

在 Supabase Dashboard：

1. **Settings（左下角齿轮）→ API** 页面：
   - **Project URL** → 这是 `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → `anon` `public`** → 这是 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → `service_role` `secret`**（点 Reveal）→ 这是 `SUPABASE_SERVICE_ROLE_KEY`。**绝密，只放服务端。**
2. 同一页面往下找 **JWT Settings → JWT Secret**（点 Reveal）→ 这是 `SUPABASE_JWT_SECRET`。**绝密。**
   （新版 Dashboard 可能在 **Settings → API → JWT Keys** 标签页下。）

### 1.6 生成应用自己的密钥

在本机项目目录执行：

```bash
npm run private:secrets
```

会打印一个 `PRIVATE_SESSION_SECRET`（64 位随机 hex）和一个日历订阅 token。把 `PRIVATE_SESSION_SECRET` 记下来。日历 token 按脚本输出的提示写入数据库：

在 Supabase SQL Editor 执行（把 `<token>` 换成脚本输出的值）：

```sql
update public.family_settings
set calendar_token = '<token>'
where family_id = '11111111-1111-1111-1111-111111111111';
```

---

## 步骤 2：环境变量配置表（完整清单）

以下是代码中实际读取的**全部**环境变量（已通读 `src/` 穷举核对，与 `.env.example` 一致）。

### 运行时必填（private-api 模式）

| 变量名 | 用途 | 格式 / 示例 | 从哪里获取 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FAMILY_DATA_MODE` | 数据模式开关，生产必须是 `private-api` | `private-api` | 自己填写 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | `https://xxxx.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key（受 RLS 约束，可暴露给浏览器） | `eyJhbGciOi...`（长 JWT） | Supabase → Settings → API → anon public |
| `NEXT_PUBLIC_PRIVATE_FAMILY_ID` | 本家庭的 UUID，须与种子数据一致 | `11111111-1111-1111-1111-111111111111` | 种子 SQL 里的 `target_family_id` |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理 key（绕过 RLS，用于 token 撤销 / 限流表） | `eyJhbGciOi...`（长 JWT） | Supabase → Settings → API → service_role（**服务端专用，绝不能带 NEXT_PUBLIC_ 前缀**） |
| `SUPABASE_JWT_SECRET` | 服务端用它签发短时 JWT，让数据读写走 RLS | 长随机字符串 | Supabase → Settings → API → JWT Settings → JWT Secret |
| `PRIVATE_SESSION_SECRET` | 会话 cookie / 邀请链接的 HMAC 签名密钥，**≥32 字符** | 64 位 hex | 本机 `npm run private:secrets` 生成 |
| `PRIVATE_PARENT_ACCESS_CODE` | 家长访问码（打开完整仪表盘） | 自定强口令，如 `M7#kq...`（12 位以上） | 自己决定 |

### 运行时可选

| 变量名 | 用途 | 缺省行为 | 备注 |
| --- | --- | --- | --- |
| `PRIVATE_CAREGIVER_ACCESS_CODE` | 看护人访问码（同家长视图） | 不配则该角色不可登录 | 自己决定 |
| `PRIVATE_TUTOR_ACCESS_CODE` | 家教访问码；**同时参与家教邀请链接的签名** | 不配则家教角色与邀请链接均不可用 | 轮换它会使所有已发出的家教邀请链接立即失效（这是有意的撤销机制） |
| `PRIVATE_VIEWER_ACCESS_CODE` | 只读访问码 | 不配则该角色不可登录 | 自己决定 |
| `PRIVATE_PARENT_ACCESS_MODE` | 只有精确值 `unsafe-open` 才开启「无访问码直接进入」 | 默认要求访问码 | **生产环境留空或设 `closed`，绝不要设 `unsafe-open`** |
| `PRIVATE_ACCESS_CODE` | 旧版家长访问码，仅向后兼容 | — | 新部署留空，用 `PRIVATE_PARENT_ACCESS_CODE` |
| `SUPABASE_LEARNING_MATERIALS_BUCKET` | 学习资料存储桶名 | 默认 `learning-materials` | 与 `private-supabase-storage.sql` 里的桶名一致即可，通常不用改 |

### 仅脚本使用（不需要配到 Vercel）

| 变量名 | 用途 |
| --- | --- |
| `PRIVATE_SMOKE_BASE_URL` | `npm run private:smoke` 烟雾测试的目标地址（也可用 `--base-url` 参数） |
| `PRIVATE_BACKUP_BASE_URL` | `npm run private:backup` 备份脚本的目标地址 |
| `PRIVATE_CALENDAR_TOKEN` | 烟雾测试验证日历订阅用 |

> `NEXT_PUBLIC_` 前缀的变量会**在构建时打进浏览器端代码**，任何人查看网页源码都能看到，所以只能放非敏感值（URL、anon key、家庭 ID、模式开关都是设计上可公开的）。其余变量只存在于服务端。

---

## 步骤 3：Vercel 部署步骤

### 3.1 导入项目

1. 登录 [vercel.com](https://vercel.com) → 点 **Add New... → Project**。
2. 在 **Import Git Repository** 列表里找到本仓库，点 **Import**（首次需要点 **Adjust GitHub App Permissions** 授权 Vercel 访问该仓库）。
3. **Framework Preset** 会自动识别为 **Next.js**，不用改。**Root Directory** 保持默认。**Build Command / Output Directory** 都保持默认。
4. **先不要点 Deploy**，先配环境变量（下一节）。

### 3.2 配置环境变量

在同一个导入页面展开 **Environment Variables**（或部署后到 **Project → Settings → Environment Variables**）：

逐条添加步骤 2 表格里的「必填」8 个变量 + 你需要的可选访问码。每条：

1. **Key** 填变量名（如 `NEXT_PUBLIC_FAMILY_DATA_MODE`）。
2. **Value** 填对应值（如 `private-api`）。
3. **Environment** 勾选 **Production**（Preview/Development 可不勾，避免预览环境连生产库）。
4. 点 **Add**。

注意事项：

- 值**不要带引号**（`.env.example` 里的引号只是文件格式）。
- 粘贴 Supabase 的长 key 时注意别混入换行或空格。
- `PRIVATE_PARENT_ACCESS_MODE` 不添加，或添加并填 `closed`。

### 3.3 部署

1. 点 **Deploy**，等 1–3 分钟。
2. 构建成功后 Vercel 给出一个 `https://<项目名>.vercel.app` 域名，点 **Visit** 打开。
3. 应看到访问码输入页（`/access`）而不是直接进入仪表盘——这说明访问控制生效了。

> Node 版本：项目 `package.json` 声明了 `"engines": { "node": "22.x" }`，Vercel 会自动使用 Node 22。如构建日志显示其他版本，到 **Settings → General → Node.js Version** 手动选 22.x。

### 3.4 （可选）绑定自己的域名

**Project → Settings → Domains → Add**，输入你的域名，按提示到域名注册商处添加 CNAME 记录。所有链接（家教邀请、日历订阅）都基于请求域名动态生成，换域名不需要改代码，但已发出的旧链接里是旧域名。

---

## 步骤 4：部署后验证清单

把 `https://your-app.vercel.app` 换成你的实际域名，逐条执行：

### 4.1 命令行验证（本机终端）

```bash
# 1. 首页应 307 跳转到 /access（未登录被拦截）
curl -s -o /dev/null -w "%{http_code}\n" https://your-app.vercel.app/
# 预期输出：307

# 2. 健康检查（未登录只回 ok，不泄露配置）
curl -s https://your-app.vercel.app/api/health
# 预期输出：{"ok":true}

# 3. 未登录访问私有 API 应被拒
curl -s -o /dev/null -w "%{http_code}\n" https://your-app.vercel.app/api/private/snapshot
# 预期输出：401 或 307

# 4. 错误访问码应被拒绝
curl -s -X POST https://your-app.vercel.app/api/access \
  -H "content-type: application/json" -d '{"code":"wrong-code"}'
# 预期输出：{"error":"..."}（提示访问码不正确）

# 5. 日历订阅 feed（把 <token> 换成 1.6 里写入数据库的值）
curl -s "https://your-app.vercel.app/api/calendar/ios?token=<token>" | head -5
# 预期输出：BEGIN:VCALENDAR 开头的 ICS 内容
```

### 4.2 浏览器验证

1. 打开 `https://your-app.vercel.app` → 应显示访问码页面。
2. 输入**家长访问码** → 应进入仪表盘，看到种子数据里的三个孩子。
3. 登录后访问 `/api/health` → 应返回 `"readyForPrivateDeploy": true` 且 `checks` 里各项为 `true`。若有 `false`，对照步骤 2 补齐对应环境变量后 **Redeploy**。
4. 新增一条学习记录 → 刷新页面数据仍在（证明写入了 Supabase，而不是 localStorage）。到 Supabase Table Editor 的 `learning_records` 表里确认多了一行。
5. 连续输错访问码 8 次 → 第 9 次应提示尝试过多被限流（验证 `access_attempts` 限流表工作正常，10 分钟窗口后自动解锁）。
6. 生成一条家教邀请链接 → 用无痕窗口打开 → 应只能看到该家教被授权范围的页面。
7. 在设置里「撤销」该邀请 → 无痕窗口刷新 → 应被踢回访问页（验证 `revoked_tokens` 生效；注意有最多 60 秒的缓存延迟，见下文）。

### 4.3 iPhone 验证

1. Safari 打开站点 → 输入家长访问码 → 分享按钮 → **添加到主屏幕**（PWA 安装，图标应为应用图标而非截图）。
2. 在应用内找到日历订阅链接（`webcal://your-app.vercel.app/api/calendar/ios?token=...`）→ 点击 → iOS 弹出「订阅日历」→ 确认后在系统日历里看到家庭事件。

### 4.4 自动化烟雾测试（可选）

```bash
npm run private:smoke -- --base-url https://your-app.vercel.app \
  --access-code "<家长访问码>" --calendar-token "<日历token>"
```

---

## 已知风险与坑

以下是部署前代码自查（2026-07-28，逐文件通读）的结论：

### 已确认没问题的项

| 检查项 | 结论 |
| --- | --- |
| localhost / 端口硬编码 | `src/` 下 **零硬编码**。仅 `scripts/private-smoke-test.mjs` 默认 `http://127.0.0.1:3000`（本地脚本默认值，可用 `--base-url` 覆盖，不影响生产）；`scripts/private-backup-all.mjs` 默认指向当前 Vercel 生产 URL，仍可用 `--base-url` 覆盖 |
| 家教邀请链接域名 | 由 `x-forwarded-host` / `x-forwarded-proto` 请求头动态生成，Vercel 自动注入这两个头，换域名零改动 |
| webcal 日历链接 | 由 `new URL(request.url).origin` 动态生成，同上 |
| PWA manifest / 图标 | `src/app/manifest.ts` 全部相对路径（`/icon`），任何域名下正确 |
| Cookie 安全 | `secure` 标志按协议动态判断，HTTPS 下自动带 Secure |
| RLS 行级安全 | **已完整定义**于 `private-supabase-schema.sql`：所有业务表启用 RLS，通过 JWT claims（`family_id` / `access_role`）校验；`revoked_tokens` / `access_attempts` 启用 RLS 且零策略（仅 service_role 可访问，符合设计）；Storage 桶策略在 `private-supabase-storage.sql` |
| private-api 模式构建 | 已用独立目录实际构建验证通过（22 条路由，仅需 4 个 `NEXT_PUBLIC_*` 占位值即可构建，不需要真实数据库连接） |
| Schema 与代码字段对齐 | 逐表逐字段核对全部 `.from().select()/.insert()/.update()`，与 schema + 迁移后的列**完全一致**，无不一致项 |

### 需要注意的坑

1. **`NEXT_PUBLIC_*` 变量是构建期固化的**。在 Vercel 改了任何 `NEXT_PUBLIC_` 变量后，必须触发 **Redeploy**（Deployments → 最新部署右侧 ⋯ → Redeploy）才生效，光改环境变量没用。
2. **`PRIVATE_PARENT_ACCESS_MODE` 千万不要设为 `unsafe-open`**。该值会让任何人不输访问码直接进入。默认（留空）就是安全的。
3. **轮换 `PRIVATE_TUTOR_ACCESS_CODE` 会使所有已发的家教邀请链接失效**。这是设计好的批量撤销手段，但轮换前要想清楚，之后需重新给家教发新链接。
4. **轮换 `PRIVATE_SESSION_SECRET` 会使所有人（包括家长自己）的登录会话和全部邀请链接失效**，所有人需重新输入访问码。
5. **token 撤销有最多 60 秒延迟**：`revoked_tokens` 在每个 serverless 实例内有 60 秒内存缓存，撤销后旧链接在极端情况下还能用最多 1 分钟。对家庭应用可接受。
6. **限流是"简化版"**：`/api/access` 每个 IP+UA 指纹 10 分钟窗口内限 8 次失败尝试；Supabase 故障时限流**失效开放**（fail-open，不会把全家锁在门外，但那段时间也不防爆破）。访问码本身要足够强。
7. **日历订阅 token 即凭据**：拿到 webcal URL 的人无需访问码即可读全家日程。不要把订阅链接发到不可信的地方；泄露时在 `family_settings.calendar_token` 里换一个值即可作废旧链接（然后 iOS 需重新订阅）。
8. **`npm run private:check-env` 脚本未检查 `SUPABASE_JWT_SECRET`**（脚本的必填清单里漏了这一项），但运行时和 `/api/health` 都需要它。以 `/api/health` 的 `readyForPrivateDeploy` 为准。
9. **不要执行 `2026-07-23-drop-retired-tables.sql` 于新库**（详见步骤 1.2 说明）。如果将来对老库执行，该文件现已内置备份表创建语句，配套回滚文件为 `2026-07-23-drop-retired-tables-rollback.sql`。
10. **middleware 跑在 Node.js runtime**（因依赖 `@supabase/supabase-js`），Vercel 支持但冷启动略慢于 Edge，属正常现象。
11. **免费档 Supabase 项目 7 天无活动会被暂停**。家庭日常使用不会触发；长期不用时去 Dashboard 点 Restore 即可。

---

## 回滚方案

### 应用层（Vercel）

出问题时回滚到上一个可用版本，**零停机**：

1. Vercel → 项目 → **Deployments**。
2. 找到最近一次正常的部署，点右侧 **⋯ → Promote to Production**。
3. 数据在 Supabase 里，应用回滚不影响数据。

### 环境变量出错

改错访问码 / 密钥时：**Settings → Environment Variables** 改回正确值 → **Redeploy**。改动 `PRIVATE_SESSION_SECRET` 会踢掉所有会话（见坑 4）。

### 数据库层（Supabase）

- **误删表数据**：付费档有 Point-in-Time Recovery；免费档有每日自动备份（Database → Backups → 选时间点 Restore）。另建议定期跑 `npm run private:backup -- --base-url https://your-app.vercel.app` 做应用层导出。
- **drop-retired-tables 迁移回滚**（仅老库适用）：执行 `docs/migrations/2026-07-23-drop-retired-tables-rollback.sql`，会从 `*_backup_20260728` 备份表恢复数据（只恢复数据，不恢复约束/RLS，详见该文件头部注释）。
- **种子数据写错**：直接改好 `private-pilot-seed-template.sql` 重跑（幂等），或在 Table Editor 里手工改。

### 彻底回退

极端情况下把 Vercel 环境变量 `NEXT_PUBLIC_FAMILY_DATA_MODE` 改回 `local` 并 Redeploy，应用退回演示数据模式（不读 Supabase），先保住可用性再排查。

---

## 还需要你提供什么

准备工作已全部就绪（迁移 SQL、环境变量清单、构建验证均已完成）。真正部署时还需要**你**提供：

1. **Supabase 账号** —— 自己注册，并按步骤 1 创建项目、执行 SQL。
2. **Vercel 账号** —— 自己注册并授权 GitHub 仓库。
3. **四个 Supabase 密钥** —— Project URL、anon key、service_role key、JWT Secret（都在你自己的 Dashboard 里，见 1.5）。
4. **自定的家长访问码**（必须）以及可选的看护人 / 家教 / 只读访问码。
5. **`PRIVATE_SESSION_SECRET`** —— 本机跑 `npm run private:secrets` 生成。
6. **真实的孩子资料** —— 改写种子 SQL（或部署后在应用里补录）。
7. **（可选）自有域名** —— 不提供就用 Vercel 免费分配的 `*.vercel.app`。
