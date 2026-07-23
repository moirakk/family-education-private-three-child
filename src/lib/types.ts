export type EventCategory = "school" | "tutoring" | "activity" | "exam" | "family";

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  grade: string;
  schoolName: string;
  schoolProgram: string;
  avatarColor: string;
  interests: string[];
  focusAreas: string[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  endsAt?: string;
  location: string;
  childIds: string[];
  notes?: string;
  allDay?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: string;
};

export type LearningRecord = {
  id: string;
  childId: string;
  subject: string;
  title: string;
  date: string;
  durationMinutes: number;
  score?: number;
  maxScore?: number;
  examType?: "quiz" | "monthly" | "midterm" | "final" | "other";
  notes?: string;
  /** Legacy fields retained while old backups are still supported. */
  confidence: number;
};

export type GoalStatus = "planned" | "in_progress" | "achieved" | "at_risk" | "cancelled";

export type EducationGoal = {
  id: string;
  childId: string;
  title: string;
  subject: string;
  targetDate: string;
  status: GoalStatus;
  progress: number;
  milestones: {
    id: string;
    title: string;
    dueDate: string;
    completed: boolean;
  }[];
  planType?: "exam" | "competition" | "school" | "other";
  customType?: string;
  syncToCalendar?: boolean;
};

export type Resource = {
  id: string;
  childId?: string;
  kind: "file" | "note" | "link" | "worksheet" | "book" | "video";
  title: string;
  subject: string;
  tags: string[];
  updatedAt: string;
};

export type LearningMaterial = {
  id: string;
  childId?: string;
  title: string;
  subject: string;
  kind: Resource["kind"];
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  localBlobId?: string;
  storagePath?: string;
  externalUrl?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type TutorFeedback = {
  id: string;
  childId: string;
  tutorName: string;
  subject: string;
  sessionDate: string;
  durationMinutes: number;
  focus: string;
  performance: string;
  homework: string;
  nextFocus: string;
  rating: number;
  createdAt: string;
};
