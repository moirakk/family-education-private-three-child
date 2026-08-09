# Fable Review Brief — Family Education Management System

面向协作方：Fable / UI 产品顾问 / 产品架构审查  
项目性质：单家庭私有定制版，服务 3 个孩子的长期教育管理  
当前阶段：真实部署、数据库、PWA、备份恢复演练均已完成，进入“长期好用性、移动端体验、信息架构取舍”阶段。

## 1. Review Links

- 私有 GitHub 仓库：<https://github.com/moirakk/family-education-private-three-child>
- 线上家长入口：<https://bzs-family-edu.netlify.app/>
- 家教反馈入口：`/tutor-feedback?code=<redacted-tutor-code>`

安全说明：

- 不要在外部审查中粘贴 `.env.local`、Supabase service role key、access code、calendar token、完整 `webcal://` 链接或真实孩子隐私内容。
- 家长端当前是 trusted-device private link 模式；家教端通过 code-bearing link 进入，只能使用课后反馈页。

## 2. Product Positioning

这是一个面向三孩家庭的教育管理系统。核心目标不是展示功能，而是帮助家长每天快速回答：

1. 今天三个孩子有什么重要事项？
2. 哪些学习过程、资料、反馈需要沉淀？
3. 未来几周/几个月的教育规划是否清楚？

当前三个孩子：

- 伯杨：马上升初一，小升初衔接期
- 仲杨：马上升五年级，高年级准备期
- 叔杨：马上升二年级，低年级习惯成型期

## 3. Current Implementation Status

### Infrastructure

- Next.js 15 + TypeScript + TailwindCSS
- Vercel production deployment
- Supabase PostgreSQL data layer
- Supabase Storage for learning-material files
- Private GitHub repository
- iPhone PWA install path verified
- One backup -> fresh Supabase restore rehearsal completed

### Access And Sharing

- Parent workspace opens by private link on trusted devices.
- Tutor feedback uses a separate code-bearing link.
- Tutor cannot access the full family workspace.
- The app has a Settings/share section for parent and tutor links.

### Main App Modes

| Mode | Intent | Current state |
| --- | --- | --- |
| Today | Daily command center | Reduced to daily brief, urgent next actions, and quick entry |
| Week | Planning | Event planner, weekly overview, unified calendar, iOS sync |
| Records | Evidence capture | Learning records, materials, tutor feedback; self-evaluation and archives folded |
| Settings | Maintenance | Share links, export/backup, PWA install, intake data |

## 4. Completed Product Decisions

- “更多” has been renamed to “设置”.
- “记录” is not split into a fifth tab; lower-frequency archive content is folded inside Records.
- Tutor feedback is independent and simplified for mobile.
- Parent workspace no longer shows a duplicate tutor feedback input form; parent side only lists feedback, copies the tutor link, and deletes entries.
- Self-evaluation is only surfaced for 伯杨 in this private version.
- Growth summary stays hidden/soft until at least 4 weeks of learning records exist.
- Deployment status is not shown to parents.
- Materials vault has been converted toward an album/file-cabinet model with child filtering and image compression.

## 5. What Fable Should Review

Please focus on UI, mobile ergonomics, and long-term parent use rather than database architecture.

### A. Daily Usability

- Does the Today screen answer “what should I do now?” within 10 seconds?
- Are the quick actions obvious enough for non-technical parents?
- Is the visual hierarchy calm enough, or still too dashboard-like?

### B. Mobile Navigation

- Are the four bottom tabs right for parent use: Today / Week / Records / Settings?
- Does Records still feel too heavy even with folded archive sections?
- Should Settings be further simplified into “Share / Backup / Install” cards?

### C. Data Entry

- Can a parent add a calendar event in 30 seconds on iPhone?
- Can a parent upload a worksheet/photo as naturally as using a photo app?
- Can a tutor complete feedback in around 1 minute?

### D. Long-Term Retrieval

- Does the materials vault feel more like a useful archive or a form-based admin panel?
- Are child colors and labels strong enough for fast scanning?
- Are records, materials, feedback, and roadmap easy to find months later?

### E. Module Retention

Please evaluate whether each module should be:

- primary
- secondary/folded
- hidden for now
- removed from the private version

Modules to assess:

- Today daily brief
- Event planner
- Unified calendar
- iOS sync
- Learning records
- Materials vault
- Tutor feedback
- Self-evaluation
- Growth summary
- Education roadmap
- Child profiles
- Family intake workspace
- Export/backup center
- PWA install card

## 6. Known Constraints

- This private version is intentionally not a full SaaS product.
- No formal login is used for parents in the current trusted-device deployment.
- Supabase Auth, RLS-hard multi-tenancy, billing, and audit logs belong to the future commercial version.
- Offline mode is read-oriented only; offline writes and conflict resolution are out of scope.
- iOS Calendar sync is one-way ICS/webcal, not CalDAV.
- Backup automation is not yet scheduled; manual full backup and restore rehearsal exist.

## 7. Desired Output From Fable

Please return:

1. Top 5 UX issues, ordered by impact on real parent use.
2. Suggested mobile IA changes, if any.
3. Which modules should be hidden or folded further.
4. Concrete UI copy/navigation improvements.
5. Any interaction that feels risky, confusing, or too “admin panel”.
6. A recommended next 3 implementation tasks.

Avoid recommending a full native app unless the web/PWA path clearly cannot satisfy the use case. The current strategic direction is private PWA first.
