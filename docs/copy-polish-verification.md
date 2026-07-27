# 文案打磨落地核查报告

核查基线：`copy-review-report.md`（工作区文件，已移出 git 跟踪）
核查对象：commit 28418fe / 39e568b / 096e037 之后的 main 分支源代码
核查方式：逐条 grep/读源码 + 生产构建 curl 渲染验证

## 一、逐条落地情况

### 访问页 `src/app/access/page.tsx`（报告 §1）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 标题「Family Education 私有访问」→「Family Education」 | 精简 | ✅ | access/page.tsx:30 仅 "Family Education" |
| 副标题 →「输入访问码。家长进入管理页，家教老师进入反馈页。」 | 精简 | ✅ | access/page.tsx:33 |
| Label「访问码」 | 保留 | ✅ | access/page.tsx:40 |
| 按钮「进入私有工作台」→「进入」 | 精简 | ✅ | access/page.tsx:44 |
| 错误「尝试次数过多…」「访问码不正确…」 | 保留 | ✅ | access/page.tsx:16,18 |

### 侧边栏 / 移动端壳 `src/components/dashboard/app-shell.tsx`（报告 §2）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 小标题「Workspace」删除 | 删除 | ✅ | 全文件无 "Workspace" |
| 4 个导航副文案 | 保留 | ✅ | app-shell.tsx:17-20 |
| 底部卡片 →「数据私有保存，定期备份。」 | 删除/留一句 | ✅ | app-shell.tsx:115 |
| 「退出登录」 | 保留 | ✅ | app-shell.tsx:118,140 |
| 移动端 header 只显示 Tab 名 | 精简 | ✅ | app-shell.tsx:130 仅 `{activeItem.label}`，无副文案 |
| 快捷按钮「新增日程」「录入成绩」 | 保留 | ✅ | app-shell.tsx:26-28 |

### 今天页 `daily-brief.tsx` / `today-command-center.tsx`（报告 §3）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 「7月27日周一 · 下午好」 | 保留 | ✅ | daily-brief.tsx:22（curl 渲染出「晚上好」变体） |
| 徽标「今日 3」 | 保留 | ✅ | daily-brief.tsx:72 |
| 同一事件两遍 → h2 直接显示「08:00 事件标题」 | 修改 | ✅ | daily-brief.tsx:77，无「下一项安排」中间行 |
| 空状态「今天没有安排」+ 泡杯茶引导 | 保留 | ✅ | daily-brief.tsx:77,80 |
| location 空时「点击查看本周安排」→ 留空 | 修改 | ✅ | daily-brief.tsx:93 仅在 location 存在时渲染 |
| 小标题「三个孩子」删除 | 删除 | ✅ | daily-brief.tsx 无「三个孩子」 |
| 紧急度两套词统一为「紧急 / 本周 / 已安排 / 已过」 | 修改 | ✅ | lib/urgency-labels.ts:4-7，daily-brief.tsx:9 与 today-command-center.tsx:9 均引用同一 `urgencyLabels` |
| 「下一步提醒」→「近期安排」 | 修改 | ✅ | today-command-center.tsx:40 |
| 「查看全部」 | 保留 | ✅ | today-command-center.tsx:41 |
| 空状态合并为「近期没有待办，好好享受这段时光。」 | 精简 | ✅ | today-command-center.tsx:86 |

### 日程页 `family-event-planner.tsx` / `unified-calendar.tsx` / `weekly-family-report.tsx`（报告 §4）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 「日程」「新增日程」「接下来」「历史日程」空状态、表单 label | 保留 | ✅ | family-event-planner.tsx 相应行 |
| 「更多设置：地点、备注、重复」/「收起更多设置」 | 保留 | ✅ | family-event-planner.tsx:130 |
| 「保存预览」块删除，重复规则并入按钮下小字 | 删除 | ✅ | 无「保存预览」；:136 保留「将按「每周」重复创建。」一行小字 |
| 校验「请选择至少一个孩子。」等 | 保留 | ✅ | family-event-planner.tsx:88 |
| toast「…进入 iOS 订阅源」→「日程已保存，会自动同步到 iOS 日历。」 | 修改 | ✅ | family-event-planner.tsx:112 |
| toast「日程已保存到当前设备。」 | 保留 | ✅ | family-event-planner.tsx:109 |
| 「保存失败，已恢复：{error.message}」→「保存失败，请重试。」+ console.error | 修改 | ✅ | family-event-planner.tsx:113,116 |
| 「统一日历」标题 | 保留 | ✅ | unified-calendar.tsx:23 |
| 描述「…事件流」删除 | 删除 | ✅ | 无 CardDescription、无「事件流」 |
| 徽标「5 类事项」删除 | 删除 | ✅ | 全站无「5 类事项」 |
| 英文时间 `EEE h:mm a` → 中文 locale | 修改 | ✅ | unified-calendar.tsx:14 `toLocaleString("zh-CN", …)` |
| 空状态「本周暂无事项」 | 保留 | ✅ | unified-calendar.tsx:53 |
| 家庭周报副句 →「按周汇总三个孩子的安排和成绩」 | 精简 | ⚠️→✅ | page.tsx:161 已按报告建议落地，但建议文案本身含硬编码「三个」，与 §3「三个是硬编码」原则冲突，本次已改为「按周汇总每个孩子的安排和成绩」 |
| 「家长版周报预览」→「本周家庭摘要」，描述「可复制、打印或存 PDF」 | 修改 | ✅ | weekly-family-report.tsx:79,81 |
| 两行英文大标题 → 一行「家庭教育周报」 | 修改 | ✅ | weekly-family-report.tsx:46,99；无 Private/Weekly Report 英文 |
| 复制文本末行「下一步：今天现场补齐…」删除 | 删除 | ✅ | weekly-family-report.tsx 无「下一步」「现场」 |
| 按钮「复制摘要 / 已复制」「打印 / 存 PDF」 | 保留 | ✅ | weekly-family-report.tsx:86,90 |

### 记录页 `learning-record-planner.tsx` / `tutor-feedback-board.tsx` / `education-roadmap.tsx`（报告 §5）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 「考试成绩」+ 最近/平均/最高 | 保留 | ✅ | learning-record-planner.tsx:183,187-189 |
| 「成绩趋势」 | 保留 | ✅ | learning-record-planner.tsx:201 |
| 空状态区分无数据 / 筛选为空 | 修改 | ✅ | learning-record-planner.tsx:208 三元区分两句 |
| 校验长句 | 保留 | ✅ | learning-record-planner.tsx:139 |
| 隐藏原始错误 →「保存失败，请重试。」 | 修改 | ✅ | learning-record-planner.tsx:159 |
| 按钮「Excel」「PDF」 | 保留 | ✅ | learning-record-planner.tsx:199 |
| 「家教课后反馈」标题 | 保留 | ✅ | tutor-feedback-board.tsx:29 |
| 描述「家长侧…」→「老师通过专属链接提交，这里只做查看。」 | 精简 | ✅ | tutor-feedback-board.tsx:31 |
| 空状态跨页引导 | 保留 | ✅ | tutor-feedback-board.tsx:82 |
| 「删除这条反馈？」+ 确认/取消 | 保留 | ✅ | tutor-feedback-board.tsx:52,55 |
| 成长计划 / 新增计划 / 空状态 / KET placeholder / iOS 开关 / 已逾期 | 保留 | ✅ | education-roadmap.tsx:45,50,53,55,62 |

### 设置页（报告 §6）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 「iOS 日历同步」标题 | 保留 | ✅ | calendar-sync-card.tsx:55 |
| 描述 →「订阅后，新增日程会自动出现在 iPhone / Mac 日历里。」 | 修改 | ✅ | calendar-sync-card.tsx:58 |
| 徽标「Apple Calendar Ready」删除 | 删除 | ✅ | 全站无该词 |
| 「今天可用方式」三条 → 两条用户步骤 | 修改 | ✅ | calendar-sync-card.tsx:64-65，无 Vercel/Supabase/演示 |
| 两个 ICS 下载按钮 → 合并「下载日历文件」 | 修改 | ✅ | calendar-sync-card.tsx:80 单按钮 |
| 「同步策略」块删除，订阅链接展示框保留 | 删除 | ✅ | 无「同步策略」；:84 保留链接展示框 |
| 「分享入口」描述 →「给家人和老师的访问链接。」 | 精简 | ✅ | share-links-card.tsx:94 |
| 徽标「私有分享」删除 | 删除 | ✅ | 全站无该词 |
| 「家长手机入口」「生成家教专属链接」「有效期 90 天」「复制给老师」「例如：王老师」 | 保留 | ✅ | share-links-card.tsx:78,98-99,118,149,202 |
| 「导出效果预览」→「导出与备份」+ 新描述 | 修改 | ✅ | export-preview-center.tsx:169,171 |
| Tab「家长周报/JSON 备份」→「周报/数据备份」 | 精简 | ✅ | export-preview-center.tsx:182-184 |
| 「导出用途…家长会议材料」→「可复制到微信，或打印 / 存 PDF。」 | 精简 | ✅ | export-preview-center.tsx:195 |
| 备份说明去 Supabase/PostgreSQL/Storage/demo，徽标改「云端备份/本机备份」 | 修改 | ✅ | export-preview-center.tsx:135-141 |
| 周报文本末行「下一步：补齐…」删除 | 删除 | ✅ | 文件内无「下一步」「补齐」 |
| 报告内文英文标题 →「家庭教育周报」 | 修改 | ❌→✅ | **核查发现漏项**：export-preview-center.tsx:86 仍是 "Family Education Weekly Report"，本次已修复为「家庭教育周报」 |
| 「导入日历后会显示」+「地点待补充」 | 保留 | ✅ | export-preview-center.tsx:253,259 |
| 「孩子年级」「例如：初一」「保存年级」 | 保留 | ✅ | grade-settings.tsx:51,62,68 |
| toast「三个孩子的年级已保存。」→「年级已保存。」 | 精简 | ✅ | grade-settings.tsx:38（本地模式 :29「年级已保存到当前设备。」合理变体） |
| 「手机桌面私有 App」→「添加到手机主屏幕」 | 修改 | ✅ | pwa-install-card.tsx:53 |
| PWA 描述 →「添加到主屏幕后，像 App 一样直接打开。」 | 精简 | ✅ | pwa-install-card.tsx:56 |
| 四步引导小标题「iPhone 添加步骤」 | 保留/简化 | ✅ | pwa-install-card.tsx:67 |
| 「安装状态」黑块删除，只留按钮 | 精简 | ✅ | 无「安装状态」；:78 按钮双态（「请按上方步骤添加」为「左侧」的合理布局适配） |

### 家教反馈页 `tutor-feedback-form.tsx`（报告 §7）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| 徽标「仅反馈入口」→「专属链接」 | 精简 | ✅ | tutor-feedback-form.tsx:128 |
| 「家教课后反馈」标题 | 保留 | ✅ | curl /tutor-feedback 渲染确认 |
| 描述 →「填写本次课后的四项反馈，提交后家长即可看到。」 | 精简 | ✅ | tutor-feedback-form.tsx:133 |
| 「本链接已绑定」+ 绑定信息 | 保留 | ✅ | tutor-feedback-form.tsx:141 |
| 四项 Label + placeholder | 保留 | ✅ | tutor-feedback-form.tsx:149-187 |
| 「已提交…」→「已提交，家长可以看到这条反馈了。」 | 精简 | ✅ | tutor-feedback-form.tsx:100 |
| 「链接验证失败，请联系家长重新生成专属链接。」 | 保留 | ✅ | tutor-feedback-form.tsx:73 |

### 系统页（报告 §8）

| 报告条目 | 标注 | 是否落地 | 证据 |
| --- | --- | --- | --- |
| error.tsx →「你的数据不会丢失。请点击下方按钮重试；如果反复出现，请联系管理员。」 | 修改 | ✅ | src/app/error.tsx:23 |
| page.tsx 配置错误页（面向部署者） | 保留 | ✅ | src/app/page.tsx:129-131 |

## 二、漏项清单（核查发现并已修复）

1. **`export-preview-center.tsx:86`**：周报导出文本首行仍为英文 "Family Education Weekly Report"（报告 §6/§4 明确要求改为「家庭教育周报」，`weekly-family-report.tsx` 已改但导出中心这份复制文本漏改）。→ 已修复为「家庭教育周报」。
2. **`src/app/page.tsx:161`**：家庭周报折叠区副文案「按周汇总三个孩子的安排和成绩」——虽是报告 §4 的字面建议文案，但与报告 §3「"三个"是硬编码，孩子数量变化即错」及总结原则冲突。→ 已改为「按周汇总每个孩子的安排和成绩」。

## 三、误删清单

无。所有【保留】条目逐条核对均仍存在（见上表证据列）。

## 四、回归风险检查

- **urgency-labels 共享**：`daily-brief.tsx:9` 与 `today-command-center.tsx:9` 均从 `@/lib/urgency-labels` 导入同一 `urgencyLabels`（紧急/本周/已安排/已过），两处一致，无第二套词残留。`tests/core/urgency.test.ts` 覆盖该模块。
- **删块死代码**：`src/lib/pilot-data.ts:267-347` 的 `parentActions` / `childOperatingPlans` / `productTracks` 三个导出全站无引用（含「把定制数据迁移到 Supabase」等开发者视角文本）。它们是早期 pilot dashboard（08c913d）遗留、非本轮文案改动产物，且不会渲染到任何页面，报告未涉及，故不动；如需清理可另开任务。
- **技术词全站 grep 复查**：用户可见文案中已无 Vercel / Supabase / PostgreSQL / Storage / ICS / PWA / 演示 / demo / 订阅源 / 事件流 / 工作台 / 家长侧 / Workspace / Apple Calendar Ready / Private Family Education Report /「三个孩子」/「5 类事项」/ error.message 直出。剩余命中均为非用户可见位置：服务端代码注释与错误（supabase-*.ts、access-rate-limit.ts、token-revocation.ts、api routes）、类型名 `FamilyWorkspace`、localStorage 读写代码、`family-data-mode.ts` 注释、API 导出 JSON 的 `note` 字段（开发者数据，不渲染）。
- **「Family Education Management System」**（layout title / manifest / pilotFamilyName / 备份 JSON family 字段）：报告未列为问题项，保持原样。

## 五、curl 渲染验证（生产构建）

`NEXT_PUBLIC_FAMILY_DATA_MODE=local` 下 `next build` + `next start -p 3288`：

- **`/`**：渲染出「今天/日程/记录/设置」四 Tab 及副文案、「数据私有保存，定期备份。」「退出登录」「新增日程」「7月27日周一 · 晚上好」「今日 3」「08:00 校内事项确认」（h2 直显事件）、「近期安排」「查看全部」、紧急度徽标「本周」。无 Workspace、无「下一项安排」「下一步提醒」「三个孩子」「点击查看本周安排」。
- **`/access`**：渲染「Family Education / 输入访问码。家长进入管理页，家教老师进入反馈页。/ 访问码 / 进入」。无「私有访问」「私有工作台」。
- **`/tutor-feedback`**：渲染「专属链接 / 家教课后反馈 / 填写本次课后的四项反馈，提交后家长即可看到。」。无「仅反馈入口」「工作台」。
- 验证完成后 server 已停止。

## 六、修复后回归

- `npm test`：34/34 通过
- `npx tsc --noEmit`：0 错误
- `npx eslint src --max-warnings 0`：通过
- `NEXT_PUBLIC_FAMILY_DATA_MODE=local npm run build`：成功

## 结论

报告约 50 条【删除/精简/修改】条目中 48 条已在前三批 commit 落地；本次核查发现 1 条漏项（导出中心英文周报标题）和 1 条与报告原则冲突的硬编码（「三个孩子」副文案），均已修复。所有【保留】条目无误删。
