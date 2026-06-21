# 伯仲叔私有版核心架构

> 目标：先让明天版本能用，再保证后续可以长期在线使用。

## 核心判断

当前最关键的不是继续堆页面，而是把数据流和权限边界搭稳：

1. 家长能编辑。
2. 数据能保存。
3. 分享是私有的。
4. iOS 日历能同步。
5. 后续能从本机 demo 平滑迁移到 Supabase。

## 伯仲叔交付形态

伯仲叔特制版采用私有 PWA Web App，而不是原生 App。

- 家长不需要去 App Store 下载。
- 家长第一次打开私有链接后，可以添加到 iPhone 主屏幕。
- 桌面图标名称为“伯仲叔教育管理”。
- 后续从主屏幕打开，体验接近日常 App。
- PWA 继续保留网页快速迭代、私有链接分享和 iOS 日历同步能力。
- Service worker 不缓存私有 API 和日历接口，只提供基础离线提示，避免敏感数据被不必要缓存。

## 三阶段路线

### Phase 1: 明天可用

- 本机浏览器保存家长现场补充资料。
- 本机新增日程进入页面总览和当前页面 ICS 导出。
- 周报可以复制、截图、打印或另存 PDF。
- 定制版保留在私有分支，不进入公开 GitHub。

### Phase 2: 伯仲叔私有在线版

- 部署到私有 Vercel 项目。
- 设置家长访问码 `PRIVATE_PARENT_ACCESS_CODE`，可选设置 caregiver/tutor/viewer code。
- iOS 日历 token 来自 `family_settings.calendar_token`，不放在 Vercel env。
- 家长通过私有链接访问。
- 不要求家长注册账号，不做登录流程。
- 写入数据通过服务端私有 API 完成，由访问码/私有链接保护。

私有写入 API：

- `PUT /api/private/intake`
- `POST /api/private/events`
- `DELETE /api/private/events?eventId=...`
- `GET /api/private/snapshot`
- `POST /api/private/learning-records`
- `POST /api/private/materials`
- `POST /api/private/self-evaluations`
- `POST /api/private/tutor-feedback`

这些 API 只在配置 `PRIVATE_PARENT_ACCESS_CODE` 或旧版 `PRIVATE_ACCESS_CODE`、`NEXT_PUBLIC_PRIVATE_FAMILY_ID`、`SUPABASE_SERVICE_ROLE_KEY` 后启用。service role key 只能存在服务端环境变量里，不能暴露到浏览器。

前端数据模式：

- 默认：`local`
- 伯仲叔私有在线版：`NEXT_PUBLIC_FAMILY_DATA_MODE=private-api`
- 大众商业版：`NEXT_PUBLIC_FAMILY_DATA_MODE=supabase`

### Phase 3: 通用商业长期版

- Supabase Auth 登录。
- PostgreSQL 持久化孩子、日程、目标、资源和现场补充资料。
- 父母可编辑，其他家庭成员只读，老师/辅导老师只看指定孩子。
- iOS 日历订阅源从数据库动态生成。
- 周报/月报从真实数据生成。

## iOS 日历长期同步

长期版通过 `family_settings.calendar_token` 生成独立订阅源：

```text
/api/calendar/ios?token=<calendar_token>
```

API 会优先通过 Supabase RPC `get_calendar_feed_by_token` 读取真实日程；如果没有配置 Supabase 或没有 token，则回退到当前 pilot 数据，保证明天版本不被后端阻塞。

## 数据库稳定性规则

- 所有长期实体使用 UUID 主键。
- 关键表开启 RLS。
- `updated_at` 由数据库 trigger 自动维护，不依赖前端时间。
- 日程强制 `ends_at > starts_at`。
- 学习记录强制分数 0-100、信心值 1-5。
- 日历 token 至少 32 位，并且唯一。
- 资源用 `(family_id, child_id, title, kind)` 去重，避免 seed 重复插入。
- ICS 订阅源默认只返回过去 18 个月到未来 36 个月的数据，避免无限膨胀。

## 数据核心

### 家庭

- family workspace
- timezone
- privacy settings
- calendar sync settings

### 孩子

- profile
- school information
- stage definition
- focus areas
- interests

### 家长现场补充资料

- school / class / program
- weekly schedule notes
- important dates
- current goals
- parent concerns
- private notes

### 日程

- category
- starts_at / ends_at
- location
- assigned children
- source: system / parent / imported
- optional recurrence later

### 教育成长

- learning records
- learning materials
- child self evaluations
- tutor feedback
- goals
- milestones
- monthly reports
- resources

### 学习资料与反馈闭环

- `learning_materials`：长期保存试卷、讲义、错题照片、阅读材料、链接和资料备注。今天版本用当前浏览器 IndexedDB 保存文件本体，正式在线版使用 Supabase Storage。
- `self_evaluations`：孩子自己记录学习状态，包含心情、投入、掌握程度、反思和下一步。
- `tutor_feedback`：家教老师每次课后反馈，包含本次重点、孩子表现、课后任务、下次方向和效果评分。

## Repository 边界

UI 不直接关心数据来自哪里，只依赖 `FamilyRepository`。

- 明天：LocalStorage repository
- 伯仲叔私有在线：No-login private API + Supabase service role repository
- 商业版：multi-tenant Supabase repository + billing + roles

## 隐私原则

- 公开仓库只保留通用产品。
- 私有定制数据只在本地私有分支、私有部署或 Supabase 私有项目。
- iOS 日历订阅不能依赖浏览器 cookie，必须使用独立 token。
- 伯仲叔特制版可以长期使用访问码/私有链接，不强迫家长登录。
- 大众商业版必须做账号、角色权限和审计。
