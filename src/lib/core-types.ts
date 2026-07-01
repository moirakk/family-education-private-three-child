import type { CalendarEvent, Child, EducationGoal, LearningRecord, Resource } from "@/lib/types";

export type FamilyWorkspace = {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  calendarName: string;
};

export type ChildIntakeProfile = {
  childId: string;
  schoolDetail: string;
  weeklySchedule: string;
  importantDates: string;
  currentGoals: string;
  parentConcerns: string;
  privateNotes: string;
  updatedAt?: string;
};

export type FamilySnapshot = {
  workspace: FamilyWorkspace;
  children: Child[];
  childIntakeProfiles: ChildIntakeProfile[];
  calendarEvents: CalendarEvent[];
  learningRecords: LearningRecord[];
  educationGoals: EducationGoal[];
  resources: Resource[];
};
