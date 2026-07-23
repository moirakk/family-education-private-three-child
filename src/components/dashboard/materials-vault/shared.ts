import type { Child, LearningMaterial } from "@/lib/types";

export type MaterialFormState = {
  childId: string;
  title: string;
  subject: string;
  kind: LearningMaterial["kind"];
  externalUrl: string;
  notes: string;
  tags: string;
};

export const quickSubjects = ["数学", "英语", "语文", "阅读", "科学", "综合"];
export const quickTags = ["错题", "讲义", "试卷", "暑假", "预习", "复习"];

export const kindLabels: Record<LearningMaterial["kind"], string> = {
  file: "文件",
  worksheet: "练习",
  note: "笔记",
  link: "链接",
  book: "书籍",
  video: "视频"
};

export const kindOptions: { value: LearningMaterial["kind"]; label: string }[] = [
  { value: "file", label: "文件" },
  { value: "worksheet", label: "练习" },
  { value: "note", label: "笔记" },
  { value: "link", label: "链接" },
  { value: "book", label: "书籍" },
  { value: "video", label: "视频" }
];

export function formatFileSize(size?: number) {
  if (!size) return "未记录大小";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatMaterialDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function splitTags(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function createInitialForm(childProfiles: Child[]): MaterialFormState {
  return {
    childId: childProfiles[0]?.id ?? "family",
    title: "",
    subject: "",
    kind: "file",
    externalUrl: "",
    notes: "",
    tags: ""
  };
}
