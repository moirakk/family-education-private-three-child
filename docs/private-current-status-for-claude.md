# Family Education Management System 私用版现状说明

> 这份文档用于让 Claude 或其他技术顾问快速理解当前私用版状态，并协助做产品、架构、安全和上线前质量分析。

## 1. 项目定位

这是一个给单个家庭长期使用的私有教育管理系统，当前服务对象是三孩家庭：

- 孩子 A：即将升初一
- 孩子 B：即将升五年级
- 孩子 C：即将升二年级

当前目标不是做展示型 demo，而是做一个家长能长期打开、持续补充数据、能同步日历、能备份恢复的私用 Web App / PWA。

长期规划分两条线：

1. 私用定制版：无正式登录，以访问码保护，部署为私有 PWA，数据进入 Supabase。
2. 大众商业版：未来再做 Supabase Auth、多家庭、多角色、权限、审计、订阅计费。

当前优先级明确偏向第 1 条：先保证私用版真实可用、长期稳定。

## 2. 技术栈

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui 风格组件
- Supabase PostgreSQL
- Supabase Storage
- Vercel 目标部署
- iOS Calendar 通过 ICS / webcal 订阅

Node 目标版本：

```text
22.x
```

`package.json` 已声明：

```json
"engines": {
  "node": "22.x"
}
```

## 3. 当前代码状态

当前私用版在本地私有分支推进：

```text
codex/private-three-child-pilot
```

最近核心提交：

```text
2ff49fd Persist private education roadmap
b3622db Persist private child profiles
f297375 Add limited tutor feedback entry
03f1a71 Add private deployment setup scripts
4fa5028 Harden private access and restore flow
1a41b96 Complete private editor CRUD
f39ba5c Persist private calendar edits
39635e4 Add private database export
```

注意：这个私用版不应公开推送到 GitHub。公开 GitHub 只适合放通用商业版或脱敏后的产品框架。

## 4. 当前已实现的产品模块

### 4.1 家庭首页

首页现在承担“今天该做什么”的入口，包括：

- 今日重点
- 本周事项
- 学习记录统计
- 教育目标进度
- 孩子档案入口
- 导出预览入口
- 新增事项入口

目前 UI 已能使用，但仍需要继续做信息层级和视觉简化，让家长第一次打开时更轻松。

### 4.2 孩子档案管理

已支持：

- 动态新增孩子
- 编辑孩子资料
- 删除空孩子资料
- 学校信息
- 年级、兴趣、关注重点
- 与学习记录、教育目标联动展示

私用数据库模式下已通过 `/api/private/children` 持久化到 Supabase。
为了避免误删长期历史，后端会拒绝删除已有日程、学习记录、教育目标、资料、自评或家教反馈的孩子档案。

### 4.3 统一日历

已支持：

- 学校事项
- 家教 / 辅导
- 活动
- 考试
- 家庭事项
- 多孩子关联
- 新增、编辑、删除

私用数据库模式下已通过 `/api/private/events` 持久化。

### 4.4 iOS 日历同步

当前方案：

- 服务端生成 ICS feed
- iPhone 通过 `webcal://.../api/calendar/ios?token=...` 订阅
- token 存在 `family_settings.calendar_token`
- token 可通过数据库轮换，旧链接会失效

当前判断：ICS / webcal 是适合私用版的方案。暂不做 CalDAV，除非未来明确需要“家长在 iOS 日历里改事件后反向同步回系统”。

### 4.5 学习记录

已支持：

- 按孩子记录学习内容
- 日期
- 科目 / 领域
- 时长
- 分数
- 信心值
- 新增、编辑、删除

私用数据库模式下已通过 `/api/private/learning-records` 持久化。

### 4.6 教育路线图

已支持：

- 按孩子创建长期目标
- 目标日期
- 领域
- 状态：计划中、推进中、已达成、需关注
- 进度百分比
- 里程碑
- 新增、编辑、删除

私用数据库模式下已通过 `/api/private/roadmap` 持久化到：

- `education_goals`
- `milestones`

路线图修改会同步影响：

- 首页教育目标指标
- 孩子档案
- 成长摘要
- 家长周报
- 导出预览

### 4.7 学习资料库

已支持：

- 学习资料索引
- 文件上传雏形
- 外部链接
- 资料备注
- 按孩子 / 科目归档
- Supabase Storage 私有 bucket
- 短期 signed URL 下载

私用数据库模式下已通过 `/api/private/materials` 写入元数据，文件本体进入 Supabase Storage。

后续仍需加强：

- 文件替换
- 文件夹 / 分类
- 预览缩略图
- 批量管理
- 更清晰的手机端上传体验

### 4.8 孩子自我评价

已支持：

- 孩子选择
- 日期
- 科目
- 心情 / 投入 / 掌握程度
- 反思内容
- 下一步
- 新增、编辑、删除

私用数据库模式下已通过 `/api/private/self-evaluations` 持久化。

### 4.9 家教反馈

已支持：

- 家长工作台中查看 / 管理反馈
- 家教轻量提交入口 `/tutor-feedback`
- 家教访问码只能进入反馈入口，不能进入完整 Dashboard
- 反馈字段包括课程重点、表现、作业、下次方向等
- 新增、编辑、删除

私用数据库模式下已通过 `/api/private/tutor-feedback` 持久化。

后续仍需加强：

- 按老师授权
- 按孩子授权
- 家教只能看自己提交的历史
- 家长审核 / 标记

### 4.10 家长现场补充工作台

用于第一次和家长开会时补充：

- 学校详情
- 固定课表
- 重要日期
- 当前目标
- 家长关注点
- 私密备注

私用数据库模式下通过 `/api/private/intake` 保存。

### 4.11 导出与备份

已支持：

- `GET /api/private/export` 导出数据库 metadata JSON
- `npm run private:backup-storage -- --out ./family-education-storage-backup` 下载 Supabase Storage 文件本体
- `npm run private:restore-storage -- --dir ./family-education-storage-backup --dry-run` 演练 Storage 文件恢复
- `npm run private:restore -- --file ./backup.json --dry-run` 恢复演练
- `npm run private:restore -- --file ./backup.json` 实际 upsert 恢复

当前 restore 覆盖表：

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

限制：

- 当前 restore 只恢复数据库 metadata。
- Storage 文件本体已有下载备份脚本和上传恢复脚本。
- 如果换 Supabase 项目，需要先恢复 Storage 文件，再恢复数据库 metadata，最后验证 `storage_path` 是否仍可下载。

## 5. 权限与访问控制现状

当前私用版不使用正式登录，采用访问码保护：

- `PRIVATE_PARENT_ACCESS_CODE`
- `PRIVATE_CAREGIVER_ACCESS_CODE`
- `PRIVATE_TUTOR_ACCESS_CODE`
- `PRIVATE_VIEWER_ACCESS_CODE`
- `PRIVATE_SESSION_SECRET`

当前策略：

- parent / caregiver 可进入完整 Dashboard。
- tutor 只能进入 `/tutor-feedback`。
- viewer 预留，当前不作为完整权限体系。
- iOS 日历使用独立 token，不使用访问码。
- 访问码通过 `POST /api/access` 提交，不进入 URL。
- 登录后签发 httpOnly、SameSite=Strict、有 90 天过期时间的签名 session cookie。
- `/api/access` 对连续错误尝试有基础 cookie 级限流；商业化前仍应接入更可靠的边缘限流或后端限流。

这比单一访问码更安全，但仍不是商业级权限系统。

已知安全边界：

- 适合单个可信家庭私用。
- 不适合直接商业化开放注册。
- 暂无正式用户身份、审计日志、细粒度 RBAC。
- 未来商业版需要重新接 Supabase Auth 和多租户权限。

## 6. 数据库与存储

核心数据库文件：

```text
docs/private-supabase-schema.sql
docs/private-supabase-storage.sql
docs/private-pilot-seed-template.sql
```

主要表：

- `families`
- `family_settings`
- `family_members`
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

Storage：

- bucket: `learning-materials`
- bucket 应为 private
- 数据库保存 `storage_path`
- 下载时生成短期 signed URL

## 7. 私用版 API 概览

当前私用 API：

- `POST /api/access`
- `GET /api/private/snapshot`
- `POST /api/private/children`
- `PUT /api/private/children`
- `DELETE /api/private/children`
- `PUT /api/private/intake`
- `POST /api/private/events`
- `PUT /api/private/events`
- `DELETE /api/private/events`
- `POST /api/private/learning-records`
- `PUT /api/private/learning-records`
- `DELETE /api/private/learning-records`
- `POST /api/private/roadmap`
- `PUT /api/private/roadmap`
- `DELETE /api/private/roadmap`
- `POST /api/private/materials`
- `PUT /api/private/materials`
- `DELETE /api/private/materials`
- `GET /api/private/self-evaluations`
- `POST /api/private/self-evaluations`
- `PUT /api/private/self-evaluations`
- `DELETE /api/private/self-evaluations`
- `GET /api/private/tutor-feedback`
- `POST /api/private/tutor-feedback`
- `PUT /api/private/tutor-feedback`
- `DELETE /api/private/tutor-feedback`
- `GET /api/private/tutor-context`
- `GET /api/private/export`
- `GET /api/calendar/ios`
- `GET /api/health`

## 8. 当前验证状态

最近验证通过：

```bash
npm run private:smoke -- --help
npm run typecheck
npm run lint
npm run build
npm run private:restore -- --file /private/tmp/family-backup-test.json --dry-run
```

本地 smoke：

- `/` 返回 200
- `/api/health` 返回 200
- Next.js production build 中已包含 `/api/private/roadmap`

当前本机没有 `.env.local`，所以还没有完成真实 Supabase 项目和 Vercel 项目的端到端联调。

## 9. 部署目标流程

目标交付方式：

1. 在 Supabase 创建私用项目。
2. 运行 schema SQL。
3. 创建 Storage private bucket。
4. 运行 seed；私用访问码版可以先不创建 Supabase Auth user，`owner_user_id` 可保持 `null`。
5. 在 Vercel 配置环境变量。
6. 部署私有链接。
7. 家长 Safari 打开链接。
8. 输入访问码。
9. 添加到 iPhone 主屏幕，作为 PWA 使用。
10. iOS Calendar 订阅 webcal 链接。

必需环境变量：

```text
NEXT_PUBLIC_FAMILY_DATA_MODE=private-api
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_PRIVATE_FAMILY_ID
PRIVATE_PARENT_ACCESS_CODE
PRIVATE_CAREGIVER_ACCESS_CODE
PRIVATE_TUTOR_ACCESS_CODE
PRIVATE_VIEWER_ACCESS_CODE
PRIVATE_SESSION_SECRET
SUPABASE_LEARNING_MATERIALS_BUCKET
```

## 10. 当前主要风险与不足

### 10.1 还没做真实云端联调

代码层已过 build，但还没有真实 Supabase + Vercel 的全链路验证。

上线前必须验证：

- 真实写入 Supabase
- 真实上传文件到 Storage
- 真实导出 JSON
- 真实 dry-run restore
- 真实 `npm run private:smoke -- --base-url <private-url> --parent-code <code> --calendar-token <token> --expect-ready --deep-private`
- 真实 iPhone PWA
- 真实 iOS Calendar 订阅

### 10.2 权限仍是私用级，不是商业级

访问码方案适合私用版，但不是 SaaS 级安全模型。

商业化前必须补：

- Supabase Auth
- 多家庭 workspace
- 家庭成员角色
- 家教 / 顾问有限授权
- 审计日志
- token 轮换后台

### 10.3 Storage 文件恢复仍需真实云端演练

当前 JSON restore 只恢复数据库 metadata，不恢复文件本体。文件下载和上传恢复脚本已经有了，但还没有在真实新 Supabase 项目里完整演练过。

上线前至少需要一份人工 runbook：

- 如何导出 Storage 文件
- 如何迁移 Storage 文件
- 如何验证 `storage_path` 是否仍可用

### 10.4 UI 还需要压缩和美化

功能已经偏全，但家长首次使用时可能觉得模块多。

建议继续优化：

- 首页只突出“今天 / 本周 / 下一步”
- 低频模块折叠或弱化
- 手机端卡片密度更高
- 表单减少视觉负担

### 10.5 私用版与商业版需要保持边界

当前私用版和通用版仍在同一代码库中演进。短期可以接受，但后续商业化前需要明确：

- 哪些是 private-only
- 哪些是 SaaS core
- 哪些是 seed/demo data
- 哪些不能进入公开仓库

## 11. 推荐 Claude 分析的问题

希望 Claude 重点分析：

1. 这个私用版距离“家长可长期使用”的最短路径还缺什么？
2. 当前访问码 + 私有 PWA + Supabase service API 的方案，有哪些必须修的安全风险？
3. 当前数据库 schema 是否足够稳定？哪些字段或关系应尽早调整？
4. 备份恢复策略是否足够？如何补 Storage 文件恢复？
5. 哪些模块应该在第一版给家长隐藏或弱化？
6. 首页信息架构如何改，才能让家长每天打开时一眼知道下一步？
7. 家教反馈入口如何设计权限，既简单又不暴露孩子全部信息？
8. 私用版和未来商业版如何拆分，避免后续大返工？
9. 当前最该做的 5 个上线前检查是什么？
10. 如果只剩 1 天交付给家长，应该优先打磨哪 3 个地方？

## 12. 当前下一步建议

短期优先级：

1. 配置真实 Supabase project，并完成 schema、storage、seed。
2. 配置真实 `.env.local`，跑 `npm run private:check-env`。
3. 本地 private-api 模式完整联调所有写入。
4. 部署 Vercel 私有链接。
5. 在 iPhone Safari 添加 PWA 到主屏幕。
6. 验证 iOS Calendar webcal 订阅。
7. 做一次真实 export + dry-run restore。
8. 优化首页 UI，减少模块压迫感。
9. 给家长准备简短使用说明。
10. 明确哪些数据不进入公开 GitHub。
