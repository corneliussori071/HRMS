import { z } from "zod";

export const createRosterSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title is too long"),
    department_id: z.string().uuid("Invalid department ID"),
    start_date: z.string().date("Invalid start date (expected YYYY-MM-DD)"),
    end_date: z.string().date("Invalid end date (expected YYYY-MM-DD)"),
    allow_self_scheduling: z.boolean().default(false),
    completion_date: z.string().date("Invalid completion date").nullable().optional(),
    min_staff_per_shift: z
      .number()
      .int()
      .min(1, "Minimum staff must be at least 1")
      .max(100, "Minimum staff cannot exceed 100")
      .default(1),
    max_staff_per_shift: z
      .number()
      .int()
      .min(1, "Maximum staff must be at least 1")
      .max(100, "Maximum staff cannot exceed 100")
      .default(99),
    shift_ids: z
      .array(z.string().uuid("Invalid shift ID"))
      .min(1, "At least one shift must be selected"),
    staff_ids: z
      .array(z.string().uuid("Invalid staff ID"))
      .min(1, "At least one staff member must be included"),
    assignments: z.record(
      z.string(),
      z.record(z.string(), z.string().uuid().nullable())
    ),
    shift_configs: z
      .array(
        z.object({
          shift_id: z.string().uuid(),
          date: z.string().date().nullable(),
          required_count: z.number().int().min(0).max(100),
        })
      )
      .optional(),
    rank_configs: z
      .array(
        z.object({
          shift_id: z.string().uuid(),
          rank_id: z.string().uuid(),
          max_count: z.number().int().min(0).max(100),
        })
      )
      .optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })
  .refine((data) => data.max_staff_per_shift >= data.min_staff_per_shift, {
    message: "Maximum staff must be at least the minimum",
    path: ["max_staff_per_shift"],
  });

export const updateRosterSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  allow_self_scheduling: z.boolean().optional(),
  completion_date: z.string().date("Invalid completion date").nullable().optional(),
  min_staff_per_shift: z.number().int().min(1).max(100).optional(),
  max_staff_per_shift: z.number().int().min(1).max(100).optional(),
});

export const updateAssignmentsSchema = z.object({
  assignments: z
    .array(
      z.object({
        user_id: z.string().uuid("Invalid user ID"),
        date: z.string().date("Invalid date"),
        shift_id: z.string().uuid("Invalid shift ID").nullable(),
        is_manual_override: z.boolean().default(false),
      })
    )
    .min(1, "At least one assignment is required"),
});

export const selfScheduleAssignmentSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  date: z.string().date("Invalid date"),
  shift_id: z.string().uuid("Invalid shift ID"),
  is_self_scheduled: z.literal(true),
});

export const rosterFilterSchema = z.object({
  department_id: z.string().uuid().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});
