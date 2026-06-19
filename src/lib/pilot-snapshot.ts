import type { FamilySnapshot } from "@/lib/core-types";
import {
  pilotCalendarEvents,
  pilotChildren,
  pilotEducationGoals,
  pilotFamilyName,
  pilotLearningRecords,
  pilotResources
} from "@/lib/pilot-data";

export const pilotFamilyId = "private-pilot-boyang-zhongyang-shuyang";

export const pilotSnapshot: FamilySnapshot = {
  workspace: {
    id: pilotFamilyId,
    name: pilotFamilyName,
    timezone: "Asia/Tokyo",
    locale: "zh-CN",
    calendarName: "伯仲叔教育日历"
  },
  children: pilotChildren,
  childIntakeProfiles: pilotChildren.map((child) => ({
    childId: child.id,
    schoolDetail: "",
    weeklySchedule: "",
    importantDates: "",
    currentGoals: child.focusAreas.join("、"),
    parentConcerns: "",
    privateNotes: ""
  })),
  calendarEvents: pilotCalendarEvents,
  learningRecords: pilotLearningRecords,
  educationGoals: pilotEducationGoals,
  resources: pilotResources
};
