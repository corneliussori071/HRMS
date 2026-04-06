import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isAdminOrHr } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/api/responses";
import { uuidSchema } from "@/lib/validations/shared";
import { updateStaffingCategorySchema } from "@/lib/validations/department-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Staffing category");

  const body: unknown = await request.json();
  const parsed = updateStaffingCategorySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staffing_categories")
    .update(parsed.data)
    .eq("id", id)
    .select("id, department_id, name, description, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A category with this name already exists in this department", 409);
    }
    return errorResponse("Failed to update category", 500);
  }
  if (!data) return notFoundResponse("Staffing category");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Staffing category");

  const supabase = await createClient();
  const { error } = await supabase.from("staffing_categories").delete().eq("id", id);
  if (error) return errorResponse("Failed to delete category", 500);

  return successResponse({ deleted: true });
}
