import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/api/responses";
import { uuidSchema } from "@/lib/validations/shared";
import { updateLeaveTypeSchema } from "@/lib/validations/leave-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "leave_settings")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave type");

  const body: unknown = await request.json();
  const parsed = updateLeaveTypeSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_types")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, description, system_type, department_id, max_days_per_year, is_active, requires_approval, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A leave type with this name already exists", 409);
    }
    return errorResponse("Failed to update leave type", 500);
  }
  if (!data) return notFoundResponse("Leave type");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "leave_settings")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave type");

  const supabase = await createClient();

  const { error } = await supabase.from("leave_types").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete leave type", 500);

  return successResponse({ deleted: true });
}
