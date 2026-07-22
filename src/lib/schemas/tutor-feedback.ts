import { z } from "zod";

export const tutorFeedbackInputSchema = z.object({
  childId: z.string().optional(),
  tutorName: z.string().optional(),
  subject: z.string().optional(),
  focus: z.string().trim().min(1, "focus is required"),
  sessionDate: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]).optional(),
  performance: z.string().optional(),
  homework: z.string().optional(),
  nextFocus: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional()
});

export type TutorFeedbackInput = z.infer<typeof tutorFeedbackInputSchema>;
