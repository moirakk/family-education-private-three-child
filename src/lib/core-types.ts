import type { CalendarEvent, Child, EducationGoal, LearningRecord, Resource } from "@/lib/types";

export type FamilyRole = "owner" | "parent" | "caregiver" | "viewer" | "tutor";

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

export type FamilyMember = {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  displayName?: string;
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

export type CalendarSyncConfig = {
  familyId: string;
  calendarName: string;
  webcalToken?: string;
  timezone: string;
};

export type FamilyRepository = {
  getSnapshot(familyId: string): Promise<FamilySnapshot>;
  saveChildIntakeProfile(profile: ChildIntakeProfile): Promise<ChildIntakeProfile>;
  createCalendarEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent>;
  deleteCalendarEvent(eventId: string): Promise<void>;
};

export function canEditFamily(role: FamilyRole) {
  return role === "owner" || role === "parent" || role === "caregiver";
}
