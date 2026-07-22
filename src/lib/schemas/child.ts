import { z } from "zod";

export const childInputSchema = z.object({
  firstName: z.string().trim().min(1, "firstName is required"),
  lastName: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  grade: z.string().optional(),
  schoolName: z.string().optional(),
  schoolProgram: z.string().optional(),
  avatarColor: z.string().optional(),
  interests: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional()
});

export type ChildInput = z.infer<typeof childInputSchema>;
