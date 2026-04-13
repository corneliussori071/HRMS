import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  role: z.enum(["admin", "hr", "manager", "staff"]).default("staff"),
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  rank_id: z.string().uuid().nullable().optional(),
  staffing_category_id: z.string().uuid().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  emergency_contact_name: z.string().trim().max(200).nullable().optional(),
  emergency_contact_phone: z.string().trim().max(20).nullable().optional(),
  date_of_employment: z.string().nullable().optional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "temporary"]).default("full_time"),
  pay_type: z.enum(["hourly", "monthly"]).default("monthly"),
  pay_rate: z.number().min(0).default(0),
  hours_per_week: z.number().min(0).max(168).default(40),
  days_per_week: z.number().int().min(0).max(7).default(5),
  bank_name: z.string().trim().max(200).nullable().optional(),
  bank_account_number: z.string().trim().max(50).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(["admin", "hr", "manager", "staff"]).optional(),
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
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
  hours_per_week: z.number().min(0).max(168).optional(),
  days_per_week: z.number().int().min(0).max(7).optional(),
  bank_name: z.string().trim().max(200).nullable().optional(),
  bank_account_number: z.string().trim().max(50).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  status: z.enum(["active", "suspended", "terminated"]).optional(),
});

export const updateCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export const csvRowSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "hr", "manager", "staff"]).default("staff"),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  date_of_employment: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "temporary"]).default("full_time"),
  pay_type: z.enum(["hourly", "monthly"]).default("monthly"),
  pay_rate: z.coerce.number().min(0).default(0),
});
