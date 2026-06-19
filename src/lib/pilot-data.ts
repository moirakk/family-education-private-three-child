import type { CalendarEvent, Child, EducationGoal, LearningRecord, Resource } from "@/lib/types";

export const pilotFamilyName = "伯仲叔教育管理中枢";

export const pilotChildren: Child[] = [
  {
    id: "bo",
    firstName: "伯杨",
    lastName: "",
    age: 12,
    grade: "马上升初一 / 小升初衔接期",
    schoolName: "主学校信息待补充",
    schoolProgram: "小升初衔接 + 数学体系化 + 英语阅读写作",
    avatarColor: "#0f766e",
    interests: ["阅读", "数学", "项目制学习"],
    focusAreas: ["小升初衔接", "数学体系化", "英文写作"]
  },
  {
    id: "zhong",
    firstName: "仲杨",
    lastName: "",
    age: 10,
    grade: "马上升五年级 / 高年级准备期",
    schoolName: "主学校信息待补充",
    schoolProgram: "校内课程 + 阅读习惯 + 数学基础巩固",
    avatarColor: "#2563eb",
    interests: ["科学", "运动", "动手实验"],
    focusAreas: ["高年级过渡", "阅读稳定性", "作业独立性"]
  },
  {
    id: "shu",
    firstName: "叔杨",
    lastName: "",
    age: 7,
    grade: "马上升二年级 / 低年级习惯成型期",
    schoolName: "主学校信息待补充",
    schoolProgram: "低年级校内基础 + 拼读启蒙 + 日常表达",
    avatarColor: "#db2777",
    interests: ["画画", "故事", "音乐律动"],
    focusAreas: ["低年级习惯", "拼读启蒙", "专注力"]
  }
];

export const pilotCalendarEvents: CalendarEvent[] = [
  {
    id: "pilot-event-1",
    title: "周一校内事项确认",
    category: "school",
    startsAt: "2026-06-22T08:00:00+09:00",
    endsAt: "2026-06-22T08:20:00+09:00",
    location: "家庭晨间检查",
    childIds: ["bo", "zhong", "shu"]
  },
  {
    id: "pilot-event-2",
    title: "伯杨：数学错题复盘",
    category: "tutoring",
    startsAt: "2026-06-22T19:00:00+09:00",
    endsAt: "2026-06-22T19:45:00+09:00",
    location: "家庭学习桌",
    childIds: ["bo"]
  },
  {
    id: "pilot-event-3",
    title: "仲杨：阅读打卡 + 口头复述",
    category: "family",
    startsAt: "2026-06-23T19:30:00+09:00",
    endsAt: "2026-06-23T20:00:00+09:00",
    location: "客厅阅读角",
    childIds: ["zhong"]
  },
  {
    id: "pilot-event-4",
    title: "叔杨：拼读小游戏",
    category: "activity",
    startsAt: "2026-06-24T18:30:00+09:00",
    endsAt: "2026-06-24T18:50:00+09:00",
    location: "家庭互动区",
    childIds: ["shu"]
  },
  {
    id: "pilot-event-5",
    title: "三人周复盘",
    category: "exam",
    startsAt: "2026-06-28T10:00:00+09:00",
    endsAt: "2026-06-28T11:00:00+09:00",
    location: "家庭会议",
    childIds: ["bo", "zhong", "shu"]
  }
];

export const pilotLearningRecords: LearningRecord[] = [
  {
    id: "pilot-lr-1",
    childId: "bo",
    subject: "数学",
    title: "错题本：分数与方程",
    date: "2026-06-18",
    durationMinutes: 45,
    score: 86,
    confidence: 4
  },
  {
    id: "pilot-lr-2",
    childId: "bo",
    subject: "英语",
    title: "段落写作：观点 + 例证",
    date: "2026-06-17",
    durationMinutes: 35,
    score: 82,
    confidence: 3
  },
  {
    id: "pilot-lr-3",
    childId: "zhong",
    subject: "阅读",
    title: "章节书复述",
    date: "2026-06-18",
    durationMinutes: 30,
    score: 80,
    confidence: 3
  },
  {
    id: "pilot-lr-4",
    childId: "shu",
    subject: "拼读",
    title: "短元音和字母音",
    date: "2026-06-18",
    durationMinutes: 20,
    score: 90,
    confidence: 5
  }
];

export const pilotEducationGoals: EducationGoal[] = [
  {
    id: "pilot-goal-1",
    childId: "bo",
    title: "建立小升初衔接节奏",
    subject: "综合规划",
    targetDate: "2026-11-30",
    status: "in_progress",
    progress: 58,
    milestones: [
      { id: "pilot-m1", title: "完成小升初数学能力盘点", dueDate: "2026-07-05", completed: true },
      { id: "pilot-m2", title: "建立每周错题复盘流程", dueDate: "2026-07-20", completed: false },
      { id: "pilot-m3", title: "完成一次模拟考试复盘", dueDate: "2026-09-15", completed: false }
    ]
  },
  {
    id: "pilot-goal-2",
    childId: "zhong",
    title: "形成五年级前的自主学习习惯",
    subject: "习惯培养",
    targetDate: "2026-09-30",
    status: "in_progress",
    progress: 46,
    milestones: [
      { id: "pilot-m4", title: "连续两周完成阅读打卡", dueDate: "2026-07-10", completed: false },
      { id: "pilot-m5", title: "独立完成每日作业清单", dueDate: "2026-08-05", completed: false }
    ]
  },
  {
    id: "pilot-goal-3",
    childId: "shu",
    title: "完成二年级学习流程衔接",
    subject: "启蒙衔接",
    targetDate: "2026-08-31",
    status: "planned",
    progress: 32,
    milestones: [
      { id: "pilot-m6", title: "熟悉晨间准备流程", dueDate: "2026-07-05", completed: true },
      { id: "pilot-m7", title: "完成短元音拼读包", dueDate: "2026-08-01", completed: false }
    ]
  }
];

export const pilotResources: Resource[] = [
  {
    id: "pilot-res-1",
    childId: "bo",
    kind: "note",
    title: "伯杨：小升初衔接观察记录",
    subject: "规划",
    tags: ["升学", "复盘", "数学"],
    updatedAt: "2026-06-18"
  },
  {
    id: "pilot-res-2",
    childId: "zhong",
    kind: "worksheet",
    title: "仲杨：阅读复述模板",
    subject: "阅读",
    tags: ["阅读", "习惯", "表达"],
    updatedAt: "2026-06-17"
  },
  {
    id: "pilot-res-3",
    childId: "shu",
    kind: "worksheet",
    title: "叔杨：拼读练习包",
    subject: "拼读",
    tags: ["启蒙", "拼读", "游戏"],
    updatedAt: "2026-06-16"
  },
  {
    id: "pilot-res-4",
    kind: "note",
    title: "家庭教育周复盘模板",
    subject: "家庭管理",
    tags: ["周复盘", "家长", "路线图"],
    updatedAt: "2026-06-15"
  }
];

export const parentActions = [
  {
    id: "action-1",
    owner: "家长",
    title: "补全三人真实学校/课程/固定安排",
    priority: "今天必须",
    status: "待补充"
  },
  {
    id: "action-2",
    owner: "家长",
    title: "确认本周固定课外课和接送时间",
    priority: "今天必须",
    status: "待确认"
  },
  {
    id: "action-3",
    owner: "系统",
    title: "把伯仲叔定制数据迁移到 Supabase",
    priority: "明日交付",
    status: "下一步"
  },
  {
    id: "action-4",
    owner: "家长",
    title: "为每个孩子设定一个本月可衡量目标",
    priority: "本周完成",
    status: "进行中"
  }
];

export const childOperatingPlans = [
  {
    childId: "bo",
    stage: "小升初衔接期",
    weeklyFocus: "初一适应准备 + 数学体系化 + 英文表达",
    parentRole: "减少临时催促，固定复盘节奏",
    risk: "进入初中前目标变多，节奏容易碎片化",
    nextStep: "每周一次错题归因，而不是只看分数"
  },
  {
    childId: "zhong",
    stage: "五年级准备期",
    weeklyFocus: "高年级过渡 + 阅读稳定性 + 作业独立性",
    parentRole: "把任务拆小，让孩子自己勾选",
    risk: "从中年级进入高年级后，任务量增加带来稳定性压力",
    nextStep: "建立每日 20 分钟阅读 + 2 分钟复述"
  },
  {
    childId: "shu",
    stage: "二年级习惯成型期",
    weeklyFocus: "低年级学习流程 + 拼读启蒙 + 晨间流程",
    parentRole: "用游戏化方式保持正反馈",
    risk: "注意力窗口短，需要稳定但轻量的学习仪式",
    nextStep: "每次学习控制在 15-20 分钟"
  }
];

export const productTracks = [
  {
    title: "伯仲叔定制版",
    deadline: "明日优先交付",
    goal: "服务当前三孩家庭，完成可直接使用的教育管理中枢。",
    scope: ["三人画像", "周计划", "家长行动清单", "学习记录", "资源中心", "路线图"]
  },
  {
    title: "通用商业版",
    deadline: "定制版稳定后推进",
    goal: "抽象为可注册、可邀请、可收费的家庭教育 SaaS。",
    scope: ["Auth", "Family workspace", "动态孩子数量", "权限", "订阅", "模板市场"]
  }
];
