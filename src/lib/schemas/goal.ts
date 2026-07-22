import { z } from "zod";

export const goalPlanTypeSchema = z.enum(["exam", "competition", "school", "other"]);

const milestoneInputSchema = z.object({
  title: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.boolean().optional()
});

export const goalInputSchema = z.object({
  childId: z.string().trim().min(1, "childId is required"),
  title: z.string().trim().min(1, "title is required"),
  subject: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.string().optional(),
  progress: z.union([z.number(), z.string()]).optional(),
  milestones: z.array(milestoneInputSchema).optional(),
  planType: goalPlanTypeSchema.optional(),
  customType: z.string().optional(),
  syncToCalendar: z.boolean().optional()
});

export type GoalInput = z.infer<typeof goalInputSchema>;
