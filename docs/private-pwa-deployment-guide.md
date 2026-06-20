# 伯仲叔私有 PWA 交付部署指南

> 目标：把你电脑上的定制版，变成家长可打开的私有链接。

## 最终交付形态

家长拿到三样东西：

1. 私有 PWA 链接。
2. 访问码。
3. iOS 日历订阅链接。

```text
网页在 Vercel
数据在 Supabase
访问靠访问码
日历靠 token
你的电脑只负责开发和维护
```

## 部署流程

```mermaid
flowchart TD
  A["你的电脑"] --> B["私有代码分支"]
  B --> C["Vercel 项目"]
  C --> D["配置环境变量"]
  D --> E["访问码保护的 PWA 链接"]

  F["Supabase 项目"] --> G["运行 schema SQL"]
  G --> H["运行 seed template"]
  H --> I["生成家庭数据"]

  E --> J["家长 Safari 打开"]
  J --> K["输入访问码"]
  K --> L["添加到主屏幕"]
  L --> M["日常像 App 使用"]

  I --> N["/api/calendar/ios?token=..."]
  N --> O["iOS Calendar 订阅"]
```

## Vercel 环境变量

必须配置：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_PRIVATE_FAMILY_ID
NEXT_PUBLIC_FAMILY_DATA_MODE=private-api
PRIVATE_ACCESS_CODE
PRIVATE_CALENDAR_TOKEN
```

本地演示可以保持：

```text
NEXT_PUBLIC_FAMILY_DATA_MODE=local
```

## Supabase 步骤

1. 创建 Supabase project。
2. 打开 SQL Editor。
3. 运行 `docs/private-supabase-schema.sql`。
4. 创建 Supabase Storage bucket：`learning-materials`，用于保存试卷、讲义、错题照片等文件本体。
5. 创建一个家长 auth user，拿到 `auth.users.id`。
6. 复制 `docs/private-pilot-seed-template.sql`。
7. 替换 `owner_user_id`。
8. 运行 seed。
9. 把 `family_id` 设置到 Vercel 的 `NEXT_PUBLIC_PRIVATE_FAMILY_ID`。

## 数据库长期稳定规则

- `docs/private-supabase-schema.sql` 可以重复运行，policies 和 triggers 会先 drop 再创建。
- 不要手动修改已分配的 `family_id`、`child_id`、`calendar_token`，这些会影响数据关联和 iOS 订阅。
- 新增真实日程必须保证结束时间晚于开始时间。
- 分数类数据只使用 0-100。
- 学习资料文件本体放 Supabase Storage，`learning_materials` 表只存索引、路径和元数据。
- 自我评价与家教反馈独立成表，避免混进普通学习记录。
- iOS 日历订阅只依赖 `family_settings.calendar_token`，不要把访问码当日历 token 使用。
- 后续如果要改表结构，新增 migration 文件，不要直接覆盖已经上线数据库里的历史语义。

## 部署后自检

本地生产验证建议先清理构建产物：

```bash
npm run build:clean
```

打开：

```text
/api/health
```

确认：

```text
readyForPrivateDeploy: true
```

再检查：

```text
/manifest.webmanifest
/icon
/sw.js
/api/calendar/ios?token=<PRIVATE_CALENDAR_TOKEN>
```

## 发给家长的话术

```text
这是给你们家的私有教育管理 App。

链接：
<私有链接>

访问码：
<访问码>

第一次用 iPhone Safari 打开，输入访问码后，点分享按钮，选择“添加到主屏幕”。
以后就可以像 App 一样从桌面打开。
```

## 注意

- 不把伯仲叔特制数据推到公开 GitHub。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放 Vercel 服务端环境变量。
- 访问码适合伯仲叔特制版；大众商业版未来再做登录和家庭成员权限。
