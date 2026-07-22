import { z } from "zod";

export const tutorShareLinkInputSchema = z.object({
  childId: z.string().trim().min(1, "childId is required"),
  tutorName: z.string().trim().min(1, "tutorName is required"),
  subject: z.string().trim().min(1, "subject is required")
});

export type TutorShareLinkInput = z.infer<typeof tutorShareLinkInputSchema>;
