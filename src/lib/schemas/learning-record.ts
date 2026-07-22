import { z } from "zod";

export const examTypeSchema = z.enum(["quiz", "monthly", "midterm", "final", "other"]);

export const learningRecordInputSchema = z.object({
  childId: z.string().trim().min(1, "childId is required"),
  subject: z.string().trim().min(1, "subject is required"),
  title: z.string().trim().min(1, "title is required"),
  date: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]).optional(),
  score: z.union([z.number(), z.string()]).optional(),
  maxScore: z.union([z.number(), z.string()]).optional(),
  examType: examTypeSchema.optional(),
  notes: z.string().optional(),
  confidence: z.union([z.number(), z.string()]).optional()
});

export type LearningRecordInput = z.infer<typeof learningRecordInputSchema>;
