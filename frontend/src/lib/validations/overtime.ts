import { z } from "zod";

export const createOvertimeSchema = z.object({
  date: z.string().date("Invalid date format (expected YYYY-MM-DD)"),
  hours: z
    .number()
    .positive("Hours must be greater than 0")
    .max(24, "Hours cannot exceed 24"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(1000, "Reason is too long"),
});

export const reviewOvertimeSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewer_note: z
    .string()
    .trim()
    .max(500, "Note is too long")
    .nullable()
    .optional(),
});

export const overtimeFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
