import { z } from "zod";
import { PERMISSIONS } from "@/types/permission";

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSIONS)),
});
