# 周五展示部署操作清单

> 本清单面向手动操作，每一步都写明了点击位置。请**严格按顺序**执行：
> 先跑数据库迁移（第 1 步），再配环境变量（第 2 步），最后触发部署（第 3 步）。
> 如果顺序颠倒（先部署新代码但数据库还没迁移），线上会报错。

---

## 1. Supabase SQL 迁移（按顺序执行 3 个文件）

### 进入 SQL Editor

1. 浏览器打开 [https://supabase.com/dashboard](https://supabase.com/dashboard)，登录后点击本项目。
2. 在左侧竖排菜单里找到 **SQL Editor**（图标是一个终端/代码符号），点击进入。
3. 点击左上角 **"+ New query"** 新建一个空白查询窗口。

### 依次执行 3 个 SQL 文件（顺序不能乱）

**执行方法（3 个文件都一样）：**
- 在电脑上用文本编辑器打开对应的 SQL 文件，全选（Cmd+A）复制（Cmd+C）；
- 粘贴到 Supabase SQL Editor 的查询窗口里；
- 点击右下角绿色的 **"Run"** 按钮（或按 Cmd+Enter）；
- 等待底部出现 **"Success. No rows returned"** 或类似成功提示，再进行下一个文件。

| 顺序 | 文件 | 作用 |
|------|------|------|
| ① | `docs/private-supabase-schema.sql` | RLS 函数重写（识别新的 JWT claim）、authenticated 角色表级 GRANT、家教（tutor）限定策略 |
| ② | `docs/private-supabase-storage.sql` | 学习资料存储桶（Storage）的 RLS 策略 |
| ③ | `docs/migrations/2026-07-22-token-security.sql` | 新建 `revoked_tokens`（登出撤销令牌）和 `access_attempts`（跨实例限流）两张表 |

**注意事项：**
- 这 3 个文件都是可以重复执行的（内置了 `create or replace` / `if not exists` / `drop policy if exists`），执行两次不会出错。
- 如果某一步报错，**先截图错误信息**，不要继续执行下一个文件。
- 执行完可以验证：左侧菜单点 **Table Editor**，应该能看到 `revoked_tokens` 和 `access_attempts` 两张新表。

---

## 2. 配置新环境变量 SUPABASE_JWT_SECRET

本轮安全改造后，服务器需要用 Supabase 项目的 JWT 密钥来签发短时令牌，**这个变量不配，网站所有读写都会报错**。

### 2.1 在 Supabase 找到 JWT Secret

1. 在 Supabase Dashboard 本项目页面，点击左侧菜单最下方的 **Settings**（齿轮图标）。
2. 在 Settings 子菜单里点击 **API**。
3. 页面往下滚动，找到 **JWT Settings**（或 **JWT Keys**）区块。
4. 找到 **JWT Secret** 字段，点击右侧的眼睛图标显示内容，再点击 **Copy** 复制。
   - 它是一长串随机字符。**这是最高机密，不要发到微信/邮件里，不要提交到代码仓库。**
   - 如果你的项目页面显示的是新版 "JWT Signing Keys" 界面，选择 **Legacy JWT Secret** 标签页即可找到。

### 2.2 配置到 Netlify

1. 打开 [https://app.netlify.com](https://app.netlify.com)，登录后点击本站点。
2. 点击顶部或左侧的 **Site configuration**（站点配置）。
3. 在左侧子菜单点击 **Environment variables**（环境变量）。
4. 点击 **"Add a variable"** → 选择 **"Add a single variable"**。
5. 填写：
   - **Key**：`SUPABASE_JWT_SECRET`
   - **Value**：粘贴刚才复制的 JWT Secret
   - Scopes / Deploy contexts 保持默认（All scopes / All deploy contexts）即可。
6. 点击 **"Create variable"** 保存。

**重要：** 环境变量只对**保存之后触发的新部署**生效。所以要先配好变量，再做第 3 步的部署。

---

## 3. 触发 Netlify 部署

代码已经推送到 GitHub（origin/main），有两种方式：

### 方式 A：自动部署（默认）

- 如果站点开启了自动部署（默认开启），push 到 main 后 Netlify 已经自动开始构建了。
- **但注意**：那次自动构建可能发生在你配置 `SUPABASE_JWT_SECRET` **之前**，环境变量没有生效。
- 保险做法：配完环境变量后，无论如何都按方式 B 手动再触发一次。

### 方式 B：手动触发（推荐本次使用）

1. 在 Netlify 站点页面，点击顶部的 **Deploys** 标签。
2. 点击右侧的 **"Trigger deploy"** 下拉按钮。
3. 选择 **"Clear cache and deploy site"**（清缓存部署，最稳妥）。
4. 等待列表最上方的部署状态从 **Building** 变成绿色的 **Published**（一般 2～5 分钟）。
5. 如果构建失败（红色 Failed），点进去看日志最后几行的报错，先截图再排查。

### 部署后先做一次健康检查

用手机或电脑浏览器访问：`https://你的域名/api/health`
- 返回的 JSON 里 `supabaseJwtSecret` 应该是 `true`；
- 如果是 `false`，说明环境变量没生效，回到第 2.2 步检查后重新部署。

---

## 4. 部署后验证清单（手机上逐项过）

> 建议用 iPhone Safari 实际操作一遍，模拟周五给家长展示的场景。

### 4.1 parent 角色完整 CRUD

- [ ] 打开网站，输入 parent 访问码，能正常进入面板。
- [ ] **日程**：点"新增日程"，类型里能看到 5 个选项：学校、辅导、活动、**测评、家庭**（后两个是新增的）。选"测评"创建一条日程，保存成功且列表里能看到。
- [ ] **日程**：编辑刚才那条日程（改标题/时间），保存成功；再删除它，确认删除后列表消失。
- [ ] **成绩**：录入一条成绩（选孩子、科目、分数），保存成功；编辑再删除，都正常。
- [ ] **家教反馈**：查看反馈列表正常；删除一条测试反馈正常。
- [ ] **成长计划**：新增一条计划，保存成功；编辑、删除正常。
- [ ] **学习资料**：上传一个小文件（如图片），能上传成功并能打开预览/下载。

### 4.2 tutor 邀请链接权限隔离

- [ ] 用 parent 身份生成一个家教邀请链接（选定某一个孩子）。
- [ ] 把链接复制到**无痕/隐私浏览窗口**（或另一台手机）打开。
- [ ] 确认家教页面**只显示被授权的那一个孩子**，看不到另外两个孩子的任何信息。
- [ ] 用家教身份提交一条反馈，成功；回到 parent 账号能看到这条反馈。

### 4.3 iOS 日历订阅

- [ ] 在面板的日历同步卡片里复制订阅链接。
- [ ] iPhone 上：**设置 → 日历 → 账户 → 添加账户 → 其他 → 添加已订阅的日历**，粘贴链接，保存。
- [ ] 打开 iOS 日历 App，能看到家里的日程（包括刚创建的测评类日程）。
- [ ] 如果之前已经订阅过，直接下拉刷新日历，确认事件仍在、无报错。

### 4.4 登出功能

- [ ] 手机上：点右上角的登出图标（门+箭头），应跳转回访问码输入页。
- [ ] 登出后直接访问首页地址，应被拦截回访问码页（说明令牌撤销生效）。
- [ ] 电脑上：左侧边栏底部的"退出登录"按钮同样验证一遍。
- [ ] 重新输入访问码，能正常登录回来。

### 4.5 输入框不再自动放大

- [ ] iPhone Safari 上，点击任意文本输入框（如日程标题、成绩备注）。
- [ ] 页面**不应该自动放大缩放**，键盘弹出后布局正常。
- [ ] 顺手确认：表单里的按钮、筛选标签在手机上都足够大、容易点中。

---

## 5. 出问题时的回滚方式

### 5.1 回滚 Netlify 到上一个部署（1 分钟搞定）

1. Netlify 站点页面 → 点击顶部 **Deploys** 标签。
2. 在部署列表里找到**上一个正常工作的部署**（看时间和 commit 信息，本次部署之前的那条）。
3. 点进那条部署的详情页。
4. 点击 **"Publish deploy"** 按钮，确认。
5. 网站立即切回旧版本，无需重新构建。

### 5.2 回滚时的注意事项

- **环境变量不会跟着回滚**：多出来的 `SUPABASE_JWT_SECRET` 对旧代码无害（旧代码不读它），**不要删**，留着下次部署用。
- **数据库迁移不用回滚**：3 个 SQL 文件都是"增量"的（新增函数/策略/表），旧代码用 service-role 直连数据库，不受这些新策略影响，可以和旧代码共存。
- **一个例外**：如果回滚后仍有问题且怀疑与数据库有关，先截图报错联系开发，**不要自己在 SQL Editor 里删表或删策略**。
- 回滚之后，验证方式同第 4 节（至少过一遍 4.1 的日程创建）。

### 5.3 常见故障速查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 所有保存操作都报错 | `SUPABASE_JWT_SECRET` 没配或配错 | 检查 `/api/health` 里 `supabaseJwtSecret` 是否为 `true`，重配后重新部署 |
| 保存报 "permission denied" 或 "row-level security" | 第 1 步的 ① 号 SQL 没执行或执行失败 | 回到 SQL Editor 重新执行 `docs/private-supabase-schema.sql` |
| 上传学习资料失败 | ② 号 SQL（storage）没执行 | 重新执行 `docs/private-supabase-storage.sql` |
| 登出后还能访问 / 登录被误锁 | ③ 号 SQL 没执行（缺表） | 重新执行 `docs/migrations/2026-07-22-token-security.sql` |
| 部署构建失败 | 看 Deploys 日志最后几行 | 截图报错，先按 5.1 回滚保住线上，再排查 |
