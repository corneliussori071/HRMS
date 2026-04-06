import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
