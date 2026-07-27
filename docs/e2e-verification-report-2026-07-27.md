# 端到端流程验证报告（家长 / 家教老师双视角）

- 日期：2026-07-27
- 分支/提交：main @ d21c1c3（已 git pull，Already up to date）
- 环境：localhost:3000，生产构建（next start），`NEXT_PUBLIC_FAMILY_DATA_MODE=local`（demo 数据模式）
- 验证方式：代码通读（页面组件 + API 路由 + middleware）、curl 调 API、curl 拉取页面 HTML 检查关键元素
- 说明：内嵌浏览器桥在本次会话中不可用（`browser_list_tabs` 持续返回空），UI 层验证以 SSR HTML + 代码路径分析为准，未做真实点击操作。

---

## 一、关键发现（先说结论）

**服务器以「生产构建」运行，但数据模式是 local——这两者组合导致大量私有 API 返回 500，这是本次验证最重要的发现。**

代码中多处以 `process.env.NODE_ENV === "production"` 作为「已部署」的判断（`_utils.ts` 的 `getPrivateWriteContext`、`private-access.ts` 的 `getSessionSecret`、`tutor-context/route.ts` 的 mode 检查），而本地 `npm run build && npm run start` 的 NODE_ENV 也是 production。于是：

- `GET /api/private/tutor-context` → 500 `"NEXT_PUBLIC_FAMILY_DATA_MODE must be private-api in production."`——家教反馈页在本地生产构建下完全打不开表单（场景 F/G 阻断）。
- `GET /api/private/share-links` → 500 `"PRIVATE_SESSION_SECRET must be set..."`——家长无法生成家教链接（场景 D 阻断）。
- 但前端因为 `usePrivateSWR` 在非 private-api 模式下暂停请求（key=null），dashboard 各卡片全部走 pilot 数据 + localStorage，家长侧核心操作不受影响。

**若以 `npm run dev` 跑 local 模式，上述 500 会变成 pilot-data 回退（tutor-context 路由有 dev 分支），家教反馈页可用「demo 模式」打开。当前部署方式（生产构建 + local 模式）是一个未被代码显式支持的组合。**

---

## 二、场景验证明细

### 视角一：家长

#### 场景 A：早上打开 dashboard 查看今日安排，给老大新增补习日程
| 步骤 | 预期 | 实际 | 结果 |
|---|---|---|---|
| 打开 `/` | 渲染今日视图 + 三个孩子 | HTML 含「今天/日程/记录/设置」四导航、伯杨/仲杨/叔杨、DailyBrief、「新增日程」快捷按钮 | 通过 |
| DailyBrief 显示今日事项 | 显示今天的安排或空状态 | pilot 事件全部落在 2026-06-22 ~ 06-28，今天 07-27 无事件，代码路径显示「今天没有安排」（daily-brief.tsx:83） | 通过（但见问题 P6） |
| 点「新增日程」 | 打开表单，切到 week 模式并滚动到 `#event-planner` | `page.tsx` changeMode → `eventFormRequest+1` → planner `useEffect(openFormRequest>0)` 打开表单，逻辑完整 | 通过（代码路径） |
| 填写并保存（选伯杨 + 辅导 + 时间） | local 模式下保存到内存/状态 | `save()`：校验链完整（孩子→标题→日期→时间→时长→重复结束日期），非 private-api 模式直接 `setStatus("日程已保存到当前设备。")` | 通过，但见 **P2（日程不持久化）** |
| curl POST /api/private/events | local 下应合理响应 | 500 `"PRIVATE_PARENT_ACCESS_CODE is required..."` | 见 P1（前端不调用此路径，不影响 UI，但错误码语义不对：配置缺失返回 500 而非 503/明确提示） |

#### 场景 B：记录老二的期中考试成绩，查看成绩趋势
| 步骤 | 预期 | 实际 | 结果 |
|---|---|---|---|
| 记录 → 录入成绩 | 表单含孩子/科目/名称/日期/得分/满分/类型 | `learning-record-planner.tsx` 表单完整，含自定义科目 | 通过 |
| 校验：得分>满分、满分≤0、空字段 | 拒绝并提示 | `save()` 统一校验：`score<0 || score>maxScore || maxScore<=0` → 提示「请检查……得分不能超过满分」 | 通过（提示是聚合式，不指出具体哪个字段，见 P8） |
| 保存 | 持久化到 localStorage | `useEffect` 写 `family-education-private-learning-records-v1` | 通过（成绩会持久化，与日程行为不一致 → P2） |
| 成绩趋势 | ≥3 条得分时显示趋势条形图 | `scored.length >= 3` 显示 12 条以内的柱状图；pilot 自带 4 条记录，首次打开即有趋势 | 通过 |
| Excel 导出 | 下载 .xls | `exportExcel()` 生成 HTML table 伪 xls，做了 `&`/`<` 转义 | 通过（格式为 HTML-in-xls，Excel 会警告，见 P9） |

#### 场景 C：查看本周家庭报告，导出/备份数据
| 步骤 | 预期 | 实际 | 结果 |
|---|---|---|---|
| 日程页 → 展开「家庭周报」 | 展示每孩子周汇总 | `WeeklyFamilyReport` 折叠卡展开逻辑完整 | 通过（代码路径） |
| 设置 → 导出效果预览 | 周报文本 / JSON 备份 / ICS 三个 tab | `export-preview-center.tsx` 三 tab 完整，复制/下载/打印按钮齐全 | 通过 |
| JSON 备份内容 | 包含所有本地数据 | local 模式下拼装 pilot 数据 + 读取 6 个 localStorage key | 通过，但 **P5：读取的 key 中 `family-education-private-events-v1`、`-intake-v1`、`-materials-v1`、`-self-evaluations-v1` 全代码库无任何写入方**（grep 仅 export-preview-center 引用），备份中这几项永远是 null，且新增的日程（只在 React state）不会进入备份 |
| 下载 ICS | 含当前事件 | `buildEducationCalendarIcs` 走当前 events（含本次会话新增的），文件名硬编码 `boyang-zhongyang-shuyang-current-calendar.ics` | 通过 |
| GET /api/calendar/ios | 返回 ICS | HTTP 200，合法 VCALENDAR，X-WR-TIMEZONE: Asia/Tokyo | 通过 |

#### 场景 D：管理分享链接（生成家教反馈链接）
| 步骤 | 预期 | 实际 | 结果 |
|---|---|---|---|
| 设置 → 分享入口 | 显示家长链接 + 家教链接生成表单 | 卡片渲染完整：孩子选择、老师姓名、科目（含自定义）、生成按钮 | 通过（UI 渲染） |
| 前端校验 | 空姓名/空科目拒绝 | `generateTutorLink()`：`!tutorName.trim() || !finalSubject` → 「请选择孩子，并填写老师姓名和科目。」 | 通过 |
| 点「生成专属链接」 | 返回带 invite token 的 URL | **失败**：POST /api/private/share-links → 403 `"Tutor links are only available to family operators."`（middleware 无访问码配置时不注入 role header，路由端 `getAccessRoleFromRequest` 得 null） | **不通过 → P1（阻断）** |
| 服务端长度限制 | tutorName≤60 / subject≤40 | 路由内有显式检查，返回 400 | 通过（代码路径） |
| 文案「有效期一年」 | 与实际 TTL 一致 | 实际 `tutorInviteTtlSeconds = 90 天` | **不通过 → P7（文案与实现不符）** |

#### 场景 E：移动端使用体验
| 检查项 | 实际 | 结果 |
|---|---|---|
| 响应式骨架 | `lg:grid-cols-[280px_1fr]` 桌面侧栏；`lg:hidden` 移动 header + 底部 4-tab 导航 | 通过 |
| 触控目标 | 按钮普遍 `min-h-11`（44px）、底部导航 `min-h-11`、图标按钮 `h-11 w-11` | 通过 |
| 安全区 | header `pt-[calc(...env(safe-area-inset-top))]`、底部导航 `pb-[max(env(safe-area-inset-bottom),0.5rem)]`、main `pb-[calc(6rem+...)]` 避让底部导航 | 通过 |
| viewport / PWA | HTML 含 viewport meta 与 manifest 链接，PwaInstallCard 存在 | 通过 |
| 移动 header 快捷键 | today/week→新增日程，records→录入成绩，more 无快捷键 | 通过（合理） |

#### 家长侧边界
- **空数据状态**：日程「还没有日程，点右上角…」、成绩「还没有符合条件的成绩…」、家教反馈「还没有家教反馈。请在设置→分享入口…」、成长计划「还没有计划…」——空状态文案完整且有行动指引。通过。
- **同时编辑多个孩子**：年级设置一次保存三个孩子（`Promise.all` PUT，local 模式直接提示已保存）；日程支持多孩子多选（toggleChild）。通过。但 **年级保存仅在 React state（P2 同类）**，刷新即丢。
- **表单校验错误**：三个表单（日程/成绩/计划）都有前置校验 + 明确中文提示；日程表单的 `issue` 是实时计算并显示在提交按钮上方。通过。

---

### 视角二：家教老师

#### 场景 F：收到家长分享的链接，打开反馈页面
| 步骤 | 预期 | 实际 | 结果 |
|---|---|---|---|
| 打开 `/tutor-feedback?invite=<token>` | middleware 验签 → 种 invite cookie → 302 到干净 URL | middleware 逻辑完整（验签、TTL 上限、revocation 检查、非 dashboard 角色补发 tutor session） | 通过（代码路径；因 P1 无法真实生成 token 走通全链路） |
| 页面初始渲染 | 「家教课后反馈」+「仅反馈入口」徽章 | curl HTML 均存在 | 通过 |
| 客户端拉 tutor-context | 返回绑定的孩子 + scope | **失败**：500（NODE_ENV=production + mode=local 组合），页面将永远停在「链接验证失败：NEXT_PUBLIC_FAMILY_DATA_MODE must be private-api in production.」 | **不通过 → P1（阻断）**；错误信息把内部环境变量名直接暴露给家教老师 → P10 |

#### 场景 G：填写课程反馈
- 表单四项（日期/授课内容/孩子表现/课后任务）全必填，`canSubmit` 禁用提交按钮直至填全 → 空提交在 UI 层被拦截。通过（代码路径）。
- 服务端 `tutorFeedbackInputSchema` 仅 `focus` 必填（min 1），`performance`/`homework` 服务端可为空——UI 必填但 schema 不强制，直接 curl 可提交只有 focus 的记录。轻微不一致（P11）。
- 提交后表单重置 + 明确成功文案「已提交。家长会在家庭教育系统里看到这条反馈。」。通过。
- 提交时 `durationMinutes: 0`、`rating: 3` 硬编码——评分字段实际上从未被家教填写，但家长侧数据模型保留 rating。设计上可接受，记录为建议（P12）。

#### 场景 H：反馈提交后家长侧能看到
- 家长侧 `TutorFeedbackBoard` 走 `useTutorFeedback` → private-api 模式下 SWR 拉 `/api/private/tutor-feedback`，与 localStorage 本地项合并。数据流正确（remote 优先 + local-only 合并 + 写回 localStorage）。通过（代码路径）。
- **local 模式下家教提交的反馈无法到达家长**：tutor-feedback 页的 POST 必须走 API（无 local 回退分支），而 local 模式 API 500 → 整条 F→G→H 链路在当前环境不可用（P1 的一部分）。

#### 家教侧边界
| 情况 | 实际行为 | 结果 |
|---|---|---|
| 无效链接 `?invite=garbage` | 验签失败 → 不种 cookie；无访问码配置时 middleware 直接放行页面（HTTP 200），随后 tutor-context 报错提示「请使用家长生成的专属链接」/验证失败 | 可接受；生产（配置访问码后）会重定向 /access，行为正确 |
| 链接过期 | `verifyTutorInviteToken` 检查 `expiresAt < now` 返回 null，cookie maxAge 也用 `min(TTL, expiresAt-now)` 双保险 | 通过（代码路径） |
| 已撤销 token | middleware 查 `isTokenRevoked`（Supabase 表）；**local 模式无 Supabase，该检查的失败路径未验证** | 通过（代码路径，生产依赖 DB） |
| 空提交 | UI 禁用按钮 + HTML required | 通过 |
| 超长内容 | Textarea 无 maxLength；schema 无 max()；生产环境将由 DB 列类型兜底 | **P11：无长度上限**，超长 focus/homework 可直达数据库 |
| 家教访问家长页面 | middleware `hasDashboardAccess` 仅 parent/caregiver；tutor 角色访问 `/` 会被重定向 /access | 通过（代码路径，权限隔离正确） |
| 家教 API 面 | tutor 仅允许 GET tutor-context + POST tutor-feedback，且服务端用 invite scope 覆盖 childId/tutorName/subject（防伪造别的孩子） | 通过（设计良好） |

---

## 三、问题清单（按严重程度排序）

### 阻断（当前运行环境下核心链路不可用）
| # | 问题 | 位置 | 详情 |
|---|---|---|---|
| P1 | **生产构建 + local 模式组合导致家教全链路（F/G/H）与分享链接生成（D）不可用** | `src/app/api/private/_utils.ts`（getPrivateWriteContext）、`src/app/api/private/tutor-context/route.ts`（NODE_ENV 判断）、`src/lib/private-access.ts`（getSessionSecret 生产强制） | tutor-context 的 local 回退只在 `NODE_ENV !== "production"` 生效；share-links GET/POST 在无访问码配置时分别 500/403。实测：`GET /api/private/tutor-context` → 500；`POST /api/private/share-links` → 403；`POST /api/private/tutor-feedback` → 500。demo/验收若必须用生产构建，需要给 local 模式显式的 API 行为定义（回退或明确 503 + 前端兜底） |

### 功能缺陷
| # | 问题 | 位置 | 详情 |
|---|---|---|---|
| P2 | **local 模式下「日程」「成长计划」「年级」不持久化，刷新即丢**；而「成绩」「家教反馈」写 localStorage——同一产品内持久化行为不一致，家长早上录的补习日程下午就没了 | `family-event-planner.tsx`（无 localStorage 写入）、`education-roadmap.tsx`（同）、`grade-settings.tsx`（同）vs `learning-record-planner.tsx:94`、`use-tutor-feedback.ts:39` | grep 确认 events/goals/grades 无任何 localStorage 写入方 |
| P5 | 导出中心读取 4 个从未有写入方的 localStorage key（`-events-v1`/`-intake-v1`/`-materials-v1`/`-self-evaluations-v1`），JSON 备份的 localData 对应项恒为 null；且会话内新增的日程（仅 state）不进备份 | `export-preview-center.tsx:22-29` | 备份「完整性」承诺与实际不符 |
| P7 | 分享链接成功文案「有效期一年」与实现 90 天不符 | `share-links-card.tsx:79` vs `private-access.ts:18` | 家长会基于错误预期分发链接 |
| P11 | 家教反馈无长度上限：schema 无 `.max()`、Textarea 无 maxLength；UI 必填的 performance/homework 在服务端 schema 是 optional | `src/lib/schemas/tutor-feedback.ts` | 超长内容/极端 payload 缺乏第一道防线 |

### 体验问题
| # | 问题 | 位置 | 详情 |
|---|---|---|---|
| P6 | pilot demo 数据全部停留在 2026-06 下旬（今天 07-27），首屏「今天没有安排」、日程页全是历史事件——demo 模式第一印象是「空的」 | `src/lib/pilot-data.ts:49-168`（硬编码日期） | 建议 pilot 数据用相对日期生成 |
| P8 | 成绩表单校验提示是一条聚合文案（「请检查孩子、科目、考试名称、日期和分数…」），不指出具体错误字段；日程表单则是逐字段提示——两者体验不一致 | `learning-record-planner.tsx` save() | |
| P10 | 家教侧错误信息直接透出内部环境变量名（「NEXT_PUBLIC_FAMILY_DATA_MODE must be private-api in production.」），对老师完全不可理解且泄露实现细节 | `tutor-feedback-form.tsx` 直接渲染 API error.message | |
| P13 | `GET /api/access` 无条件 307 到 /access；直接浏览器访问 POST-only 端点的兜底可以，但 `/api/private/children|events|learning-records|roadmap` 的 GET 返回裸 405 无 JSON body，与其它端点错误格式不一致 | 各 route.ts | 实测 405 空 body |
| P14 | 删除确认交互良好（两段式），但日程/成绩/计划的删除失败恢复只提示不重试；均可接受，仅记录 | 各 planner | |

### 建议
| # | 建议 |
|---|---|
| P12 | 家教提交硬编码 `rating:3`、`durationMinutes:0`：家长侧数据模型保留了这些字段但永远是默认值，要么在表单中开放，要么从展示中去掉，避免误读「老师给了 3 分」 |
| P15 | `use-database-backup.ts` 的状态机中 `data、error、loading` 三态之外的 fallback 也是 "loading"（第 19 行重复分支），逻辑冗余可简化 |
| P16 | 中间件对 `/api/private` 的保护在「无访问码配置」时完全放行（`!hasAccessConfig` 直通），依赖各路由自行报错——demo 模式可接受，但生产部署若漏配访问码，等于整个 API 无鉴权（虽然 supabase 配置同样会缺失从而 500，形成事实防线）。建议在文档/启动检查中把「访问码与 mode 必须成组配置」显式化 |

---

## 四、整体评估

**家长核心流程：基本顺畅（demo 数据模式下）。**
今天视图 → 新增日程 → 录成绩看趋势 → 周报/备份/ICS 导出，UI 完整、校验齐全、空状态友好、移动端适配（44px 触控、安全区、底部导航）到位。最大硬伤是 P2 持久化不一致（日程刷新即丢）和 P6 demo 数据过期导致的空首屏。

**家教老师核心流程：在当前运行环境（生产构建 + local 模式）不可用。**
分享链接无法生成（403）、反馈页 context 拉取 500、反馈无法提交——整条 F→G→H 链路阻断。代码本身的设计是好的（invite token 签名 + scope 绑定 + 最小 API 面 + revocation），链路在 private-api 模式（配好 Supabase + 访问码 + session secret）下路径完整；在 dev server（NODE_ENV=development）下也有 pilot 回退可演示。问题在于「local 模式」被隐式假设为只在 dev 下运行，一旦用生产构建跑 demo 就露馅。

**优先修复排序建议**：P1（定义 local+production 组合的行为）→ P2（统一持久化）→ P7/P10（文案与错误信息）→ P5/P11 → 其余。
