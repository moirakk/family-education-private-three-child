import { z } from "zod";

export const selfEvaluationInputSchema = z.object({
  childId: z.string().trim().min(1, "childId is required"),
  subject: z.string().trim().min(1, "subject is required"),
  reflection: z.string().trim().min(1, "reflection is required"),
  evaluationDate: z.string().optional(),
  mood: z.union([z.number(), z.string()]).optional(),
  effort: z.union([z.number(), z.string()]).optional(),
  confidence: z.union([z.number(), z.string()]).optional(),
  nextStep: z.string().optional()
});

export type SelfEvaluationInput = z.infer<typeof selfEvaluationInputSchema>;
