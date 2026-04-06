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
import { updateDepartmentSchema } from "@/lib/validations/department";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Department");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, description, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Department");

  return successResponse(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Department");

  const body: unknown = await request.json();
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, description, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A department with this name already exists", 409);
    }
    return errorResponse("Failed to update department", 500);
  }
  if (!data) return notFoundResponse("Department");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Department");

  const supabase = await createClient();

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete department", 500);

  return successResponse({ deleted: true });
}
