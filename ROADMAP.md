# Family Education Management System — 路线图

**这份文档是活文档，不是一次性交付物。** 之前几轮我分别发过 `family-education-audit.md`、`family-education-followup.md` 两份独立文档，那种"每轮开一个新文件"的方式已经不适合现在的节奏——从这份文档开始，状态直接在文档里更新（标记"已完成/进行中/未开始"），不再每轮新建文件。这份文档取代前两份，前两份可以归档或删除。

**分支**：`main`
**本次更新基准提交**：`15a5294 Add family and tutor share links`
**验证**：`npm run typecheck && npm run lint && npm run test && npm run build` 全部通过

---

## 本轮已完成（本次会话里直接改好并验证过）

- [x] `sortEventsByUrgency` 补上 `today` 参数透传，修复测试套件"因为日历翻页而周期性变红"的问题（`src/lib/urgency.ts` + `tests/core/urgency.test.ts`）
- [x] 新增 `.github/workflows/ci.yml`，每次 push/PR 自动跑 typecheck/lint/test/build 四件套
- [x] 家教反馈页完成手机端重构；家长工作台移除重复填写表单，只保留反馈列表、复制家教链接和删除能力（`src/app/tutor-feedback/page.tsx` + `src/components/dashboard/tutor-feedback-board.tsx`）
- [x] 完成一次真实的备份 -> 全新 Supabase 测试项目 -> 恢复演练；数据库恢复和 Storage 恢复脚本均跑通，测试项目行数验证通过。

这两项已经在本地验证通过（6/6 测试、build 成功），随本次回复的文件一起发给 Codex 应用即可，不需要它重新设计，只需要应用 + 推送触发 CI 首次运行。

---

## 明确不做的事（连同原因）

在给方案之前先说清楚"cut"了什么——这是你让我做的事，不是漏掉了：

| 原本可能会做的事 | 处理方式 | 为什么 |
|---|---|---|
| 引入 Sentry 之类的错误监控服务 | 改为最小方案：`error.tsx` 兜底时顺手往一张 Supabase 表里写一行错误日志 | 私有单家庭工具，Sentry 的告警/看板/团队协作能力全用不上，多一个第三方账号和依赖不划算 |
| 家教访问码的后台管理/轮换界面 | 不做界面，只写清楚"改 `PRIVATE_TUTOR_ACCESS_CODE` 环境变量 + 重新部署"这几步操作说明 | 一个家庭只有一个家教，轮换频率是"一年可能一次"，做界面纯属过度工程 |
| 自我评价"按孩子开放"做成可配置开关系统 | 直接在组件里按孩子 ID/年级硬编码条件 | 私有版数据结构固定（伯杨/仲杨/叔杨不会变来变去），做通用配置层是给一个不存在的"其他家庭"预留扩展性 |
| PWA 完整离线读写（本地队列、离线新增再同步） | 只做只读缓存：缓存 App Shell 和最近一次快照，离线时能看上次数据，不能离线新增 | 完整离线同步涉及冲突处理，工作量和收益不成比例；家长真正需要的是"地铁里能看一眼"，不是"地铁里能新增日程" |
| 独立的定时备份服务/worker | 用 GitHub Actions 的 `schedule` 触发器，或 Vercel Cron 直接调用一个包一层现有备份脚本逻辑的 API route | 已经有能跑的备份脚本，不需要为"定时"这一件事再起一套基础设施 |
| 家教反馈的审核/编辑历史工作流 | 只加一个家长侧的删除按钮 | 一个受信任的家教，"防审核"的价值远低于"填错了能删掉"这个基本需求 |
| 资料库一次性做完孩子/科目/标签三种筛选 | 先做孩子 + 时间倒序两个最高频的，标签筛选放下一批 | 一次做三种筛选器容易做出一个自己都不会用的复杂过滤面板，先验证最常用的两个够不够用 |
| 多家庭/角色权限/计费抽象（Brief P2） | 维持现状，不投入 | Brief 自己也写了"大众版以后再抽象"，这里只是重申：现在一行代码都不用为这个方向写 |

---

## P0（下一批要做的）

### 1. 备份 → 恢复演练（已完成）

**完成时间**：2026-07-06

**备份来源**：生产站点 `https://family-education-private-three-child.vercel.app`

**本地备份目录**：`private-backups/restore-rehearsal-2026-07-06`

**测试 Supabase 项目**：`eujuwxcbnkwhdxrtnsan`（Family Education Restore Drill）

**执行结果**：
- `npm run private:backup -- --base-url https://family-education-private-three-child.vercel.app --out ./private-backups/restore-rehearsal-2026-07-06` 成功。
- `npm run private:restore -- --file ./private-backups/restore-rehearsal-2026-07-06/database-export.json --storage-manifest ./private-backups/restore-rehearsal-2026-07-06/storage/storage-manifest.json --dry-run` 成功。
- 在新测试项目执行 `docs/private-supabase-schema.sql` 和 `docs/private-supabase-storage.sql` 成功。
- 指向测试项目运行 `npm run private:restore` 成功。
- 指向测试项目运行 `npm run private:restore-storage` 成功。

**恢复后验证**：
- `families`: 1
- `family_settings`: 1
- `children`: 3（伯杨、仲杨、叔杨）
- `child_intake_profiles`: 3
- `calendar_events`: 5
- `calendar_event_children`: 9
- `education_goals`: 3
- `resources`: 4
- `learning_records` / `learning_materials` / `self_evaluations` / `tutor_feedback`: 当前备份中均为 0，恢复后也为 0。
- `learning-materials` Storage bucket 当前对象数为 0，Storage 恢复脚本已跑通，但还没有真实文件样本可验证 signed download。

**后续注意**：等资料库出现第一批真实上传文件后，需要再做一次轻量 Storage 恢复验证，重点确认文件 body、metadata、signed download 都能恢复。

### 2. 家教反馈页手机端重构（已完成）

已按 Brief 方案完成：选孩子/科目/老师 → 本次重点 → 表现与任务 → 折叠的更多设置。手机端不需要横向滚动，必填字段控制为孩子、老师、科目、本次重点 4 个，提交后有明确状态反馈。

家长工作台里的重复家教反馈填写表单已去掉，家长侧只保留"查看家教填的反馈列表 + 复制家教专属链接 + 删除某条反馈"。

### 3. 访问模式的正式确认（不是代码任务，是一个决定）

现状核实：`PRIVATE_PARENT_ACCESS_MODE` 默认是 `open`，任何拿到主链接的人 GET 一次就会被签发家长角色 cookie，拿到完整工作台权限；访问码的失败次数限流仍是进程内存 Map，不共享状态。

这不是一个需要 Codex 写代码解决的问题，是需要你确认一句话：**"链接本身不泄露"是否是你能接受的安全边界。** 如果接受，就维持现状，不用做任何改动；如果不接受，才需要把 `PRIVATE_PARENT_ACCESS_MODE` 切回 `code` 并且优先做限流迁移到 Upstash Redis。我不替你做这个决定，但需要你明确选一个，不要让它继续停留在"没想过"的状态。

---

## P1

### 4. 资料库改成"相册模式"

默认视图：按时间倒序的缩略图网格，顶部一排孩子 Chip 筛选（复用已有的孩子 Chip 组件），上传入口做成右下角悬浮相机按钮。现在"先展开一个字段很多的表单"的模式反过来。上传前用 canvas 把照片压缩到 1600px 宽左右再上传——手机直拍原图 3-8MB，三个孩子长期攒下来 Supabase Storage 免费层的 1GB 会比预期更快用完，压缩后基本不影响可读性。

### 5. "记录" tab 页内分组

不拆 tab（拆了底部导航会变成 5 个，得不偿失），改成页内两个分组：
- **日常记录**（默认展开）：学习记录、资料库、家教反馈
- **档案与回顾**（默认折叠）：孩子档案、成长趋势、教育路线图

自我评价只对伯杨展示（按 Brief 决策，二年级的叔杨做结构化自评不现实）。成长趋势模块在数据积累不满 4-6 周之前，不渲染任何图表，用一行文字"数据还在积累，X 周后会看到趋势"代替——渲染一个只有 1-2 个数据点的空图表除了让页面显得更空，没有别的作用。

### 6. "更多" 改名"设置"

对应 Brief 第 8 问。改名之后里面的内容也按"设置"的心智重新分组：账号与分享（分享入口、访问模式说明）、数据（备份导出、初始化资料）、应用（PWA 安装）。"部署状态"这种工程信息，不放在家长可见的设置页里，如果开发者自己需要看，加一个只有直接输入特定路径才能访问的隐藏页面即可。

---

## P2（缓一缓再做）

- 图片压缩之外，如果 Storage 用量后续接近上限，再考虑加一个"清理超过 N 年未访问资料"的手动入口，现在数据量还没到需要这个的规模。
- 限流迁移到 Upstash Redis：如果 P0 第 3 项里你确认维持 `open` 模式，这项可以降到 P2；如果切回 `code` 模式，这项要提到 P0。

---

## Brief 第 7 节八个问题 —— 结论汇总

| 问题 | 结论 |
|---|---|
| 四 tab 是否合理 | 合理，保留 |
| "记录"是否拆分 | 不拆 tab，页内分两组（见上面第 5 项） |
| 免访问码是否合适 | 可以，但需要你正式确认这个安全边界（见上面 P0 第 3 项），不是默认自动合理 |
| 家教反馈是否完全独立 | 是，家长工作台里的重复表单要去掉 |
| 自我评价是否都保留 | 只给伯杨开放，硬编码判断，不做配置系统 |
| 教育路线/成长趋势是否弱化 | 弱化，归入"档案与回顾"折叠区，数据不够时不渲染图表 |
| 资料库是否该像相册 | 是，见上面 P1 第 4 项 |
| 底部 tab 命名是否要调整 | "更多"→"设置" |

---

## 执行顺序

1. 应用本次已经改好的两个小修复（urgency 透传 + CI），推送后确认 GitHub Actions 首次运行是绿的
2. 备份 → 恢复演练（P0-1，不涉及写代码，是一次操作演练）
3. 家教反馈页重构（P0-2）
4. 访问模式的决定（P0-3，你来定，不阻塞其他任务并行推进）
5. 资料库相册化 + 压缩（P1-4）
6. 记录页分组 + 更多改名设置（P1-5、P1-6，两个都是纯减法，可以合并成一轮做）
