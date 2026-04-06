import { z } from "zod";

const nullToUndefined = (v: unknown) => (v === null || v === "" ? undefined : v);

export const paginationSchema = z.object({
  page: z.preprocess(nullToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(nullToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export const uuidSchema = z.string().uuid("Invalid ID format");
