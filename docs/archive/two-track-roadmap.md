# Two-Track Roadmap

本项目从现在开始按两条产品线推进：

1. 伯仲叔三人小孩儿定制版管理系统
2. 通用版、可商用的家庭教育管理系统

## Track 1: 伯仲叔定制版

目标：明天交付一个能给当前家庭直接使用和展示的三孩教育管理系统。

### 核心定位

这是一个家庭内部教育运营中枢，不追求先做复杂 SaaS，而是先解决当前家庭真实使用问题：

- 三个孩子的信息集中管理。
- 每周学校、辅导、活动、测评、家庭复盘统一安排。
- 每个孩子有独立阶段、重点、风险和下一步行动。
- 家长能看到“今天该做什么”，而不是只看到数据。
- 后续可以逐步接入真实数据库和文件上传。

### 明日优先交付范围

- 伯 / 仲 / 叔三人档案。
- 三人管理矩阵。
- 家长行动看板。
- 本周总览。
- 近期事项。
- 统一日历。
- 成长摘要。
- 教育路线图。
- 资源中心。
- README 和产品结构说明。

### 需要家长补充的信息

- 三个孩子真实姓名或展示名。
- 年龄、年级、学校、班级或课程体系。
- 固定课外课时间。
- 近期考试、测评、学校活动。
- 每个孩子当前最大教育目标。
- 每个孩子本周最需要家长介入的一件事。
- 已有资料：课表、作业要求、考试范围、学习资料链接或文件。

## Track 2: 通用商业版

目标：把定制版中被验证的家庭管理流程抽象成可注册、可付费、可扩展的 SaaS。

### 核心定位

通用版不是简单把三孩数据换成动态数据，而是要形成可商业化的产品系统：

- 多家庭 workspace。
- 任意数量孩子。
- 家长、照护者、导师等角色权限。
- 数据持久化。
- 文件存储。
- 订阅计费。
- 可复用模板。
- 报告和提醒系统。

### 商业版模块

- Auth and onboarding
- Family workspace
- Dynamic child management
- Calendar and reminders
- Growth tracking
- Roadmap templates
- Resource storage
- Role-based sharing
- Subscription billing
- AI-assisted monthly reports

## Engineering Strategy

### Shared Core

两条产品线共享以下底层：

- Next.js App Router
- TypeScript domain models
- Tailwind and UI primitives
- Supabase-ready schema
- Child / event / record / goal / resource concepts

### Custom Layer

伯仲叔定制版通过 `src/lib/pilot-data.ts` 承载当前家庭专属数据和运营模型。

### SaaS Layer

通用版后续通过 Supabase tables、Auth、RLS、Storage 和 billing 把 pilot data 替换为真实 workspace data。

## Immediate Next Steps

1. 把伯仲叔真实信息填入 `pilot-data.ts`。
2. 接 Supabase，持久化 child / event / goal / resource。
3. 做 Vercel 部署。
4. 加入截图和 demo 说明。
5. 从定制版使用反馈中抽象商业版模板。
