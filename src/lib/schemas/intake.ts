import { z } from "zod";

export const intakeInputSchema = z.object({
  childId: z.string().trim().min(1, "childId is required"),
  schoolDetail: z.string().optional(),
  weeklySchedule: z.string().optional(),
  importantDates: z.string().optional(),
  currentGoals: z.string().optional(),
  parentConcerns: z.string().optional(),
  privateNotes: z.string().optional()
});

export type IntakeInput = z.infer<typeof intakeInputSchema>;
