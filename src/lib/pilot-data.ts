import type { CalendarEvent, Child, EducationGoal, LearningRecord, Resource } from "@/lib/types";

function atDay(offsetDays: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dayStamp(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

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
    id: "pilot-event-past-1",
    title: "三人周复盘",
    category: "exam",
    startsAt: atDay(-2, 10, 0),
    endsAt: atDay(-2, 11, 0),
    location: "家庭会议",
    childIds: ["bo", "zhong", "shu"]
  },
  {
    id: "pilot-event-past-2",
    title: "仲杨：阅读打卡 + 口头复述",
    category: "family",
    startsAt: atDay(-1, 19, 30),
    endsAt: atDay(-1, 20, 0),
    location: "客厅阅读角",
    childIds: ["zhong"]
  },
  {
    id: "pilot-event-1",
    title: "校内事项确认",
    category: "school",
    startsAt: atDay(0, 8, 0),
    endsAt: atDay(0, 8, 20),
    location: "家庭晨间检查",
    childIds: ["bo", "zhong", "shu"]
  },
  {
    id: "pilot-event-2",
    title: "伯杨：数学错题复盘",
    category: "tutoring",
    startsAt: atDay(0, 19, 0),
    endsAt: atDay(0, 19, 45),
    location: "家庭学习桌",
    childIds: ["bo"]
  },
  {
    id: "pilot-event-3",
    title: "叔杨：睡前故事时间",
    category: "family",
    startsAt: atDay(0, 20, 30),
    endsAt: atDay(0, 20, 50),
    location: "叔杨房间",
    childIds: ["shu"]
  },
  {
    id: "pilot-event-4",
    title: "仲杨：阅读打卡 + 口头复述",
    category: "family",
    startsAt: atDay(1, 19, 30),
    endsAt: atDay(1, 20, 0),
    location: "客厅阅读角",
    childIds: ["zhong"]
  },
  {
    id: "pilot-event-5",
    title: "叔杨：拼读小游戏",
    category: "activity",
    startsAt: atDay(2, 18, 30),
    endsAt: atDay(2, 18, 50),
    location: "家庭互动区",
    childIds: ["shu"]
  },
  {
    id: "pilot-event-6",
    title: "伯杨：英语段落写作练习",
    category: "tutoring",
    startsAt: atDay(3, 19, 0),
    endsAt: atDay(3, 19, 40),
    location: "家庭学习桌",
    childIds: ["bo"]
  },
  {
    id: "pilot-event-7",
    title: "三人周复盘",
    category: "exam",
    startsAt: atDay(5, 10, 0),
    endsAt: atDay(5, 11, 0),
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
    date: dayStamp(-3),
    durationMinutes: 45,
    score: 86,
    confidence: 4
  },
  {
    id: "pilot-lr-2",
    childId: "bo",
    subject: "英语",
    title: "段落写作：观点 + 例证",
    date: dayStamp(-4),
    durationMinutes: 35,
    score: 82,
    confidence: 3
  },
  {
    id: "pilot-lr-3",
    childId: "zhong",
    subject: "阅读",
    title: "章节书复述",
    date: dayStamp(-2),
    durationMinutes: 30,
    score: 80,
    confidence: 3
  },
  {
    id: "pilot-lr-4",
    childId: "shu",
    subject: "拼读",
    title: "短元音和字母音",
    date: dayStamp(-1),
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
    targetDate: dayStamp(120),
    status: "in_progress",
    progress: 58,
    milestones: [
      { id: "pilot-m1", title: "完成小升初数学能力盘点", dueDate: dayStamp(-14), completed: true },
      { id: "pilot-m2", title: "建立每周错题复盘流程", dueDate: dayStamp(10), completed: false },
      { id: "pilot-m3", title: "完成一次模拟考试复盘", dueDate: dayStamp(50), completed: false }
    ]
  },
  {
    id: "pilot-goal-2",
    childId: "zhong",
    title: "形成五年级前的自主学习习惯",
    subject: "习惯培养",
    targetDate: dayStamp(65),
    status: "in_progress",
    progress: 46,
    milestones: [
      { id: "pilot-m4", title: "连续两周完成阅读打卡", dueDate: dayStamp(12), completed: false },
      { id: "pilot-m5", title: "独立完成每日作业清单", dueDate: dayStamp(35), completed: false }
    ]
  },
  {
    id: "pilot-goal-3",
    childId: "shu",
    title: "完成二年级学习流程衔接",
    subject: "启蒙衔接",
    targetDate: dayStamp(35),
    status: "planned",
    progress: 32,
    milestones: [
      { id: "pilot-m6", title: "熟悉晨间准备流程", dueDate: dayStamp(-14), completed: true },
      { id: "pilot-m7", title: "完成短元音拼读包", dueDate: dayStamp(6), completed: false }
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
    updatedAt: dayStamp(-2)
  },
  {
    id: "pilot-res-2",
    childId: "zhong",
    kind: "worksheet",
    title: "仲杨：阅读复述模板",
    subject: "阅读",
    tags: ["阅读", "习惯", "表达"],
    updatedAt: dayStamp(-3)
  },
  {
    id: "pilot-res-3",
    childId: "shu",
    kind: "worksheet",
    title: "叔杨：拼读练习包",
    subject: "拼读",
    tags: ["启蒙", "拼读", "游戏"],
    updatedAt: dayStamp(-4)
  },
  {
    id: "pilot-res-4",
    kind: "note",
    title: "家庭教育周复盘模板",
    subject: "家庭管理",
    tags: ["周复盘", "家长", "路线图"],
    updatedAt: dayStamp(-5)
  }
];
