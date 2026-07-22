import { z } from "zod";

export const materialKindSchema = z.enum(["file", "note", "link", "worksheet", "book", "video"]);

export const materialInputSchema = z.object({
  childId: z.string().optional(),
  title: z.string().trim().min(1, "title is required"),
  subject: z.string().trim().min(1, "subject is required"),
  kind: materialKindSchema.optional(),
  fileName: z.string().optional(),
  fileSize: z.union([z.number(), z.string()]).optional(),
  mimeType: z.string().optional(),
  storagePath: z.string().optional(),
  externalUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export type MaterialInput = z.infer<typeof materialInputSchema>;

export const materialFormInputSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  subject: z.string().trim().min(1, "subject is required"),
  childId: z.string().nullable().optional(),
  kind: materialKindSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
  tags: z.string().nullable().optional()
});

export type MaterialFormInput = z.infer<typeof materialFormInputSchema>;
