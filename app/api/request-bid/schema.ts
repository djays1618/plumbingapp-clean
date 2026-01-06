import { z } from "zod";

export const JobPayloadSchema = z.object({
  issueCode: z.string().min(1),
  issueLabel: z.string().min(1),
  severity: z.enum(["routine", "urgent", "emergency"]),
  estimatedPriceRange: z.object({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
  }),
  duration: z.string().min(1),
  answers: z.record(z.string(), z.string()),
  createdAt: z.string().datetime(),
});

export type JobPayloadValidated = z.infer<typeof JobPayloadSchema>;
