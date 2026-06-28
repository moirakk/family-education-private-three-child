#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function isHelp() {
  return process.argv.includes("--help") || process.argv.includes("-h");
}

function usage() {
  console.log("Usage: npm run private:obsidian -- --file ./database-export.json --out ./Family-Education-Vault");
  console.log("");
  console.log("Input:");
  console.log("- JSON from /api/private/export");
  console.log("- or database-export.json from npm run private:backup");
  console.log("");
  console.log("Output:");
  console.log("- An Obsidian-compatible Markdown vault folder");
}

function normalizeBackup(payload) {
  if (payload?.tables) return payload;
  if (payload?.data?.tables) return payload.data;
  throw new Error("Input JSON must contain a tables object from /api/private/export.");
}

function valueOrDash(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function dateOnly(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function escapeMarkdown(value) {
  return valueOrDash(value).replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function slugify(value) {
  return valueOrDash(value)
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Untitled";
}

function childName(child) {
  return [child.first_name, child.last_name].filter(Boolean).join("") || child.id;
}

function table(headers, rows) {
  if (rows.length === 0) return "_暂无记录。_\n";

  return [
    `| ${headers.map(escapeMarkdown).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdown).join(" | ")} |`)
  ].join("\n") + "\n";
}

function frontmatter(values) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${JSON.stringify(item)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return `${lines.join("\n")}\n\n`;
}

function sortByDate(rows, field, direction = "asc") {
  return [...rows].sort((a, b) => {
    const left = new Date(a[field] ?? 0).getTime();
    const right = new Date(b[field] ?? 0).getTime();
    return direction === "asc" ? left - right : right - left;
  });
}

function buildContext(backup) {
  const tables = backup.tables;
  const children = tables.children ?? [];
  const childNameById = new Map(children.map((child) => [child.id, childName(child)]));

  const eventChildIds = new Map();
  for (const row of tables.calendar_event_children ?? []) {
    eventChildIds.set(row.event_id, [...(eventChildIds.get(row.event_id) ?? []), row.child_id]);
  }

  const milestonesByGoal = new Map();
  for (const milestone of tables.milestones ?? []) {
    milestonesByGoal.set(milestone.goal_id, [...(milestonesByGoal.get(milestone.goal_id) ?? []), milestone]);
  }

  return {
    backup,
    tables,
    children,
    childNameById,
    eventChildIds,
    milestonesByGoal
  };
}

function childLink(name) {
  return `[[01 Children/${slugify(name)}|${name}]]`;
}

function namesForChildIds(ctx, childIds) {
  return childIds.map((id) => ctx.childNameById.get(id) ?? id);
}

function eventChildNames(ctx, eventId) {
  return namesForChildIds(ctx, ctx.eventChildIds.get(eventId) ?? []);
}

function rowsForChild(ctx, tableName, childId) {
  return (ctx.tables[tableName] ?? []).filter((row) => row.child_id === childId);
}

function eventsForChild(ctx, childId) {
  return (ctx.tables.calendar_events ?? []).filter((event) => (ctx.eventChildIds.get(event.id) ?? []).includes(childId));
}

function buildDashboard(ctx) {
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingEvents = sortByDate(ctx.tables.calendar_events ?? [], "starts_at")
    .filter((event) => {
      const startsAt = new Date(event.starts_at);
      return startsAt >= now && startsAt <= soon;
    })
    .slice(0, 12);
  const atRiskGoals = (ctx.tables.education_goals ?? []).filter((goal) => goal.status === "at_risk");
  const recentFeedback = sortByDate(ctx.tables.tutor_feedback ?? [], "session_date", "desc").slice(0, 8);

  return [
    frontmatter({
      type: "dashboard",
      generated_at: new Date().toISOString(),
      source: ctx.backup.source,
      family_id: ctx.backup.familyId
    }),
    "# Family Education Dashboard",
    "",
    `生成时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "",
    "## 孩子总览",
    "",
    table(
      ["孩子", "年级", "学校", "重点方向"],
      ctx.children.map((child) => [
        childLink(childName(child)),
        child.grade,
        child.school_name,
        (child.focus_areas ?? []).join("、")
      ])
    ),
    "## 未来 14 天日程",
    "",
    table(
      ["时间", "孩子", "类型", "事项", "地点"],
      upcomingEvents.map((event) => [
        dateTime(event.starts_at),
        eventChildNames(ctx, event.id).join("、"),
        event.category,
        event.title,
        event.location
      ])
    ),
    "## 需要关注的目标",
    "",
    table(
      ["孩子", "目标", "科目", "进度", "目标日期"],
      atRiskGoals.map((goal) => [
        ctx.childNameById.get(goal.child_id),
        goal.title,
        goal.subject,
        `${goal.progress ?? 0}%`,
        dateOnly(goal.target_date)
      ])
    ),
    "## 最近家教反馈",
    "",
    table(
      ["日期", "孩子", "老师", "科目", "评分", "重点"],
      recentFeedback.map((feedback) => [
        dateOnly(feedback.session_date),
        ctx.childNameById.get(feedback.child_id),
        feedback.tutor_name,
        feedback.subject,
        feedback.rating,
        feedback.focus
      ])
    ),
    "## 快速入口",
    "",
    "- [[02 Calendar/Calendar|统一日历]]",
    "- [[03 Learning/Learning Records|学习记录]]",
    "- [[04 Materials/Materials|学习资料库]]",
    "- [[05 Roadmap/Education Roadmap|教育路线图]]",
    "- [[06 Feedback/Self Evaluations|孩子自评]]",
    "- [[06 Feedback/Tutor Feedback|家教反馈]]",
    "- [[99 System/Export Metadata|导出元数据]]",
    ""
  ].join("\n");
}

function buildChildPage(ctx, child) {
  const name = childName(child);
  const events = sortByDate(eventsForChild(ctx, child.id), "starts_at").slice(0, 20);
  const records = sortByDate(rowsForChild(ctx, "learning_records", child.id), "record_date", "desc").slice(0, 20);
  const goals = rowsForChild(ctx, "education_goals", child.id);
  const materials = sortByDate(rowsForChild(ctx, "learning_materials", child.id), "created_at", "desc").slice(0, 20);
  const evaluations = sortByDate(rowsForChild(ctx, "self_evaluations", child.id), "evaluation_date", "desc").slice(0, 12);
  const feedback = sortByDate(rowsForChild(ctx, "tutor_feedback", child.id), "session_date", "desc").slice(0, 12);
  const intake = (ctx.tables.child_intake_profiles ?? []).find((profile) => profile.child_id === child.id);

  return [
    frontmatter({
      type: "child",
      child_id: child.id,
      name,
      grade: child.grade,
      school: child.school_name,
      tags: ["child"]
    }),
    `# ${name}`,
    "",
    "## 基本信息",
    "",
    table(
      ["字段", "内容"],
      [
        ["年级", child.grade],
        ["年龄", child.age],
        ["学校", child.school_name],
        ["项目/班型", child.school_program],
        ["兴趣", (child.interests ?? []).join("、")],
        ["重点方向", (child.focus_areas ?? []).join("、")]
      ]
    ),
    "## 家长补充资料",
    "",
    table(
      ["字段", "内容"],
      [
        ["学校详情", intake?.school_detail],
        ["每周安排", intake?.weekly_schedule],
        ["重要日期", intake?.important_dates],
        ["当前目标", intake?.current_goals],
        ["家长关注", intake?.parent_concerns],
        ["私密备注", intake?.private_notes]
      ]
    ),
    "## 近期日程",
    "",
    table(
      ["时间", "类型", "事项", "地点"],
      events.map((event) => [dateTime(event.starts_at), event.category, event.title, event.location])
    ),
    "## 学习记录",
    "",
    table(
      ["日期", "科目", "标题", "时长", "分数", "信心"],
      records.map((record) => [
        dateOnly(record.record_date),
        record.subject,
        record.title,
        record.duration_minutes,
        record.score,
        record.confidence
      ])
    ),
    "## 教育目标",
    "",
    table(
      ["目标", "科目", "状态", "进度", "目标日期"],
      goals.map((goal) => [goal.title, goal.subject, goal.status, `${goal.progress ?? 0}%`, dateOnly(goal.target_date)])
    ),
    ...goals.flatMap((goal) => [
      `### ${goal.title}`,
      "",
      table(
        ["里程碑", "截止", "完成"],
        (ctx.milestonesByGoal.get(goal.id) ?? []).map((milestone) => [
          milestone.title,
          dateOnly(milestone.due_date),
          milestone.completed_at ? "是" : "否"
        ])
      )
    ]),
    "## 学习资料",
    "",
    table(
      ["标题", "科目", "类型", "文件/链接", "备注"],
      materials.map((material) => [
        material.title,
        material.subject,
        material.kind,
        material.external_url || material.storage_path || material.file_name,
        material.notes
      ])
    ),
    "## 自我评价",
    "",
    table(
      ["日期", "科目", "心情", "投入", "信心", "反思", "下一步"],
      evaluations.map((evaluation) => [
        dateOnly(evaluation.evaluation_date),
        evaluation.subject,
        evaluation.mood,
        evaluation.effort,
        evaluation.confidence,
        evaluation.reflection,
        evaluation.next_step
      ])
    ),
    "## 家教反馈",
    "",
    table(
      ["日期", "老师", "科目", "评分", "重点", "表现", "作业", "下次重点"],
      feedback.map((item) => [
        dateOnly(item.session_date),
        item.tutor_name,
        item.subject,
        item.rating,
        item.focus,
        item.performance,
        item.homework,
        item.next_focus
      ])
    ),
    ""
  ].join("\n");
}

function buildCalendarPage(ctx) {
  const events = sortByDate(ctx.tables.calendar_events ?? [], "starts_at");
  return [
    frontmatter({ type: "calendar_index", generated_at: new Date().toISOString() }),
    "# 统一日历",
    "",
    table(
      ["时间", "孩子", "类型", "事项", "结束", "地点", "说明"],
      events.map((event) => [
        dateTime(event.starts_at),
        eventChildNames(ctx, event.id).join("、"),
        event.category,
        event.title,
        dateTime(event.ends_at),
        event.location,
        event.description
      ])
    )
  ].join("\n");
}

function buildLearningPage(ctx) {
  const records = sortByDate(ctx.tables.learning_records ?? [], "record_date", "desc");
  return [
    frontmatter({ type: "learning_records", generated_at: new Date().toISOString() }),
    "# 学习记录",
    "",
    table(
      ["日期", "孩子", "科目", "标题", "时长", "分数", "信心", "备注"],
      records.map((record) => [
        dateOnly(record.record_date),
        ctx.childNameById.get(record.child_id),
        record.subject,
        record.title,
        record.duration_minutes,
        record.score,
        record.confidence,
        record.notes
      ])
    )
  ].join("\n");
}

function buildMaterialsPage(ctx) {
  const materials = sortByDate(ctx.tables.learning_materials ?? [], "created_at", "desc");
  return [
    frontmatter({ type: "materials", generated_at: new Date().toISOString() }),
    "# 学习资料库",
    "",
    table(
      ["创建时间", "孩子", "标题", "科目", "类型", "文件名", "Storage Path", "外部链接", "标签", "备注"],
      materials.map((material) => [
        dateOnly(material.created_at),
        material.child_id ? ctx.childNameById.get(material.child_id) : "全家",
        material.title,
        material.subject,
        material.kind,
        material.file_name,
        material.storage_path,
        material.external_url,
        (material.tags ?? []).join("、"),
        material.notes
      ])
    ),
    "> 注：Supabase Storage 文件本体请从完整备份目录 `storage/files/**` 查看或恢复。",
    ""
  ].join("\n");
}

function buildRoadmapPage(ctx) {
  const goals = sortByDate(ctx.tables.education_goals ?? [], "target_date");
  return [
    frontmatter({ type: "roadmap", generated_at: new Date().toISOString() }),
    "# 教育路线图",
    "",
    ...goals.flatMap((goal) => [
      `## ${ctx.childNameById.get(goal.child_id) ?? "未知孩子"} - ${goal.title}`,
      "",
      table(
        ["字段", "内容"],
        [
          ["科目", goal.subject],
          ["状态", goal.status],
          ["进度", `${goal.progress ?? 0}%`],
          ["目标日期", dateOnly(goal.target_date)],
          ["说明", goal.description]
        ]
      ),
      table(
        ["里程碑", "截止日期", "完成"],
        (ctx.milestonesByGoal.get(goal.id) ?? []).map((milestone) => [
          milestone.title,
          dateOnly(milestone.due_date),
          milestone.completed_at ? "是" : "否"
        ])
      )
    ])
  ].join("\n");
}

function buildSelfEvaluationsPage(ctx) {
  const evaluations = sortByDate(ctx.tables.self_evaluations ?? [], "evaluation_date", "desc");
  return [
    frontmatter({ type: "self_evaluations", generated_at: new Date().toISOString() }),
    "# 孩子自我评价",
    "",
    table(
      ["日期", "孩子", "科目", "心情", "投入", "信心", "反思", "下一步"],
      evaluations.map((evaluation) => [
        dateOnly(evaluation.evaluation_date),
        ctx.childNameById.get(evaluation.child_id),
        evaluation.subject,
        evaluation.mood,
        evaluation.effort,
        evaluation.confidence,
        evaluation.reflection,
        evaluation.next_step
      ])
    )
  ].join("\n");
}

function buildTutorFeedbackPage(ctx) {
  const feedback = sortByDate(ctx.tables.tutor_feedback ?? [], "session_date", "desc");
  return [
    frontmatter({ type: "tutor_feedback", generated_at: new Date().toISOString() }),
    "# 家教反馈",
    "",
    table(
      ["日期", "孩子", "老师", "科目", "时长", "评分", "重点", "表现", "作业", "下次重点"],
      feedback.map((item) => [
        dateOnly(item.session_date),
        ctx.childNameById.get(item.child_id),
        item.tutor_name,
        item.subject,
        item.duration_minutes,
        item.rating,
        item.focus,
        item.performance,
        item.homework,
        item.next_focus
      ])
    )
  ].join("\n");
}

function buildMetadataPage(ctx) {
  return [
    frontmatter({ type: "export_metadata", generated_at: new Date().toISOString() }),
    "# 导出元数据",
    "",
    table(
      ["字段", "内容"],
      [
        ["来源", ctx.backup.source],
        ["导出时间", ctx.backup.exportedAt],
        ["Family ID", ctx.backup.familyId],
        ["表数量", Object.keys(ctx.tables).length],
        ["Storage Bucket", ctx.backup.storage?.bucket],
        ["Storage 说明", ctx.backup.storage?.note]
      ]
    ),
    "## 表记录数",
    "",
    table(
      ["表", "记录数"],
      Object.entries(ctx.tables).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
    )
  ].join("\n");
}

async function writeMarkdown(outputRoot, relativePath, content) {
  const filePath = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function main() {
  if (isHelp()) {
    usage();
    return;
  }

  const inputFile = getArgValue("--file");
  const outputRoot = getArgValue("--out");

  if (!inputFile || !outputRoot) {
    throw new Error("Usage: npm run private:obsidian -- --file ./database-export.json --out ./Family-Education-Vault");
  }

  const backup = normalizeBackup(JSON.parse(await readFile(inputFile, "utf8")));
  const ctx = buildContext(backup);

  await mkdir(outputRoot, { recursive: true });
  await writeMarkdown(outputRoot, "00 Dashboard.md", buildDashboard(ctx));
  await writeMarkdown(outputRoot, "02 Calendar/Calendar.md", buildCalendarPage(ctx));
  await writeMarkdown(outputRoot, "03 Learning/Learning Records.md", buildLearningPage(ctx));
  await writeMarkdown(outputRoot, "04 Materials/Materials.md", buildMaterialsPage(ctx));
  await writeMarkdown(outputRoot, "05 Roadmap/Education Roadmap.md", buildRoadmapPage(ctx));
  await writeMarkdown(outputRoot, "06 Feedback/Self Evaluations.md", buildSelfEvaluationsPage(ctx));
  await writeMarkdown(outputRoot, "06 Feedback/Tutor Feedback.md", buildTutorFeedbackPage(ctx));
  await writeMarkdown(outputRoot, "99 System/Export Metadata.md", buildMetadataPage(ctx));

  for (const child of ctx.children) {
    await writeMarkdown(outputRoot, `01 Children/${slugify(childName(child))}.md`, buildChildPage(ctx, child));
  }

  await writeMarkdown(
    outputRoot,
    "README.md",
    [
      "# Family Education Obsidian Vault",
      "",
      "这是从 Family Education Management System 导出的 Obsidian Vault。",
      "",
      "入口文件：[[00 Dashboard]]",
      "",
      "建议在 Obsidian 中打开整个文件夹，而不是单独打开某个 Markdown 文件。",
      "",
      "说明：",
      "",
      "- Markdown 文件适合长期阅读、搜索、归档。",
      "- 日程提醒仍建议使用系统 Web App 的 iOS Calendar 订阅。",
      "- 文件资料本体请结合完整备份目录中的 `storage/files/**` 保存。",
      ""
    ].join("\n")
  );

  console.log(`Obsidian vault exported: ${outputRoot}`);
  console.log(`Children: ${ctx.children.length}`);
  console.log("Open the output folder in Obsidian, then start from 00 Dashboard.md.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
