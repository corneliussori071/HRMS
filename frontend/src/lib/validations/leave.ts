import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    leave_type: z.enum([
      "annual",
      "sick",
      "personal",
      "unpaid",
      "maternity",
      "paternity",
      "bereavement",
    ]),
    start_date: z.string().date("Invalid start date (expected YYYY-MM-DD)"),
    end_date: z.string().date("Invalid end date (expected YYYY-MM-DD)"),
    reason: z
      .string()
      .trim()
      .min(1, "Reason is required")
      .max(1000, "Reason is too long"),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });

export const reviewLeaveRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewer_note: z
    .string()
    .trim()
    .max(500, "Note is too long")
    .nullable()
    .optional(),
});

export const leaveFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  leave_type: z
    .enum([
      "annual",
      "sick",
      "personal",
      "unpaid",
      "maternity",
      "paternity",
      "bereavement",
    ])
    .optional(),
});
