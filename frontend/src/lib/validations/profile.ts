import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(200, "Full name is too long"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .nullable()
    .optional(),
  avatar_url: z.string().url("Invalid URL").nullable().optional(),
});

export const adminUpdateProfileSchema = updateProfileSchema.extend({
  role: z.enum(["admin", "hr", "manager", "staff"]),
  department_id: z.string().uuid("Invalid department ID").nullable().optional(),
});
