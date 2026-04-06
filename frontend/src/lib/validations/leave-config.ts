import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").nullable().optional(),
  system_type: z.enum(["pto", "fixed"]),
  department_id: z.string().uuid("Invalid department ID").nullable().optional(),
  max_days_per_year: z.coerce.number().min(0).max(365),
  is_active: z.boolean().optional().default(true),
  requires_approval: z.boolean().optional().default(true),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

export const createLeaveAllocationSchema = z.object({
  leave_type_id: z.string().uuid("Invalid leave type ID"),
  rank_id: z.string().uuid("Invalid rank ID").nullable().optional(),
  role: z.enum(["admin", "hr", "manager", "staff"]).nullable().optional(),
  days_per_year: z.coerce.number().min(0).max(365).optional().default(0),
  hours_worked: z.coerce.number().min(0).optional().default(0),
  hours_earned: z.coerce.number().min(0).optional().default(0),
});

export const updateLeaveAllocationSchema = z.object({
  days_per_year: z.coerce.number().min(0).max(365).optional(),
  hours_worked: z.coerce.number().min(0).optional(),
  hours_earned: z.coerce.number().min(0).optional(),
});

export const updateLeaveSystemSchema = z.object({
  leave_system: z.enum(["pto", "fixed", "both"]),
});

export const createLeaveRequestV2Schema = z
  .object({
    leave_type_id: z.string().uuid("Invalid leave type"),
    start_date: z.string().date("Invalid start date (expected YYYY-MM-DD)"),
    end_date: z.string().date("Invalid end date (expected YYYY-MM-DD)"),
    reason: z.string().trim().min(1, "Reason is required").max(1000, "Reason is too long"),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });
