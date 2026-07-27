import { z } from "zod";

export const tutorFeedbackInputSchema = z.object({
  childId: z.string().optional(),
  tutorName: z.string().optional(),
  subject: z.string().optional(),
  focus: z.string().trim().min(1, "focus is required").max(2000, "focus must be at most 2000 characters"),
  sessionDate: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]).optional(),
  performance: z.string().max(2000, "performance must be at most 2000 characters").optional(),
  homework: z.string().max(2000, "homework must be at most 2000 characters").optional(),
  nextFocus: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional()
});

export type TutorFeedbackInput = z.infer<typeof tutorFeedbackInputSchema>;
