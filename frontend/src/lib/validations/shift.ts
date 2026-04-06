import { z } from "zod";

export const createShiftSchema = z.object({
  department_id: z.string().uuid("Invalid department ID"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  short_key: z.string().trim().min(1, "Key is required").max(5, "Key must be 5 characters or fewer"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  break_minutes: z.number().int().min(0, "Break minutes cannot be negative").max(480, "Break cannot exceed 480 minutes").default(0),
  min_hours_per_week: z.number().min(0, "Minimum hours cannot be negative").max(168, "Cannot exceed 168 hours per week").default(0),
  max_hours_per_week: z.number().min(0, "Maximum hours cannot be negative").max(168, "Cannot exceed 168 hours per week").default(40),
  is_active: z.boolean().optional().default(true),
}).refine(
  (data) => data.max_hours_per_week >= data.min_hours_per_week,
  { message: "Maximum hours must be greater than or equal to minimum hours", path: ["max_hours_per_week"] }
);

export const updateShiftSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  short_key: z.string().trim().min(1, "Key is required").max(5, "Key must be 5 characters or fewer"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  break_minutes: z.number().int().min(0).max(480),
  min_hours_per_week: z.number().min(0).max(168),
  max_hours_per_week: z.number().min(0).max(168),
  is_active: z.boolean(),
}).partial().refine(
  (data) => {
    if (data.min_hours_per_week !== undefined && data.max_hours_per_week !== undefined) {
      return data.max_hours_per_week >= data.min_hours_per_week;
    }
    return true;
  },
  { message: "Maximum hours must be greater than or equal to minimum hours", path: ["max_hours_per_week"] }
);
