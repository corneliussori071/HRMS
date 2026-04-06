import { z } from "zod";

export const createShiftSchema = z.object({
  department_id: z.string().uuid("Invalid department ID"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (expected HH:MM)"),
  is_active: z.boolean().optional().default(true),
});

export const updateShiftSchema = createShiftSchema.partial().omit({ department_id: true });
