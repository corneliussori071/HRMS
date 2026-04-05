import { z } from "zod";

export const createAttendanceSchema = z.object({
  date: z.string().date("Invalid date format (expected YYYY-MM-DD)"),
  check_in: z.string().datetime({ offset: true }).optional(),
  check_out: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["present", "absent", "late", "half_day"]).default("present"),
  notes: z.string().trim().max(500, "Notes are too long").nullable().optional(),
});

export const updateAttendanceSchema = createAttendanceSchema.partial();

export const attendanceFilterSchema = z.object({
  date: z.string().date().optional(),
  user_id: z.string().uuid().optional(),
  status: z.enum(["present", "absent", "late", "half_day"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
