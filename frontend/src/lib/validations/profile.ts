import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(200, "Full name is too long")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .nullable()
    .optional(),
  avatar_url: z.string().url("Invalid URL").nullable().optional(),
});

export const adminUpdateProfileSchema = updateProfileSchema.extend({
  role: z.enum(["admin", "hr", "manager", "staff"]).optional(),
  department_id: z.string().uuid("Invalid department ID").nullable().optional(),
  rank_id: z.string().uuid().nullable().optional(),
  staffing_category_id: z.string().uuid().nullable().optional(),
  shift_id: z.string().uuid().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  emergency_contact_name: z.string().trim().max(200).nullable().optional(),
  emergency_contact_phone: z.string().trim().max(20).nullable().optional(),
  date_of_employment: z.string().nullable().optional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "temporary"]).optional(),
  pay_type: z.enum(["hourly", "monthly"]).optional(),
  pay_rate: z.number().min(0).optional(),
  bank_name: z.string().trim().max(200).nullable().optional(),
  bank_account_number: z.string().trim().max(50).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  status: z.enum(["active", "suspended", "terminated"]).optional(),
});
