import { z } from "zod";

export const createStaffingCategorySchema = z.object({
  department_id: z.string().uuid("Invalid department ID"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateStaffingCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const createRankSchema = z.object({
  department_id: z.string().uuid("Invalid department ID"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  level: z.number().int().min(0).default(0),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateRankSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  level: z.number().int().min(0).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
});
