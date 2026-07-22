import { z } from "zod";

export const eventCategorySchema = z.enum(["school", "tutoring", "activity", "exam", "family"]);

export const eventInputSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  category: eventCategorySchema,
  startsAt: z.string().trim().min(1, "startsAt is required"),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  childIds: z.array(z.string().trim().min(1)).min(1, "childIds is required"),
  allDay: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceEnd: z.string().optional()
});

export type EventInput = z.infer<typeof eventInputSchema>;
