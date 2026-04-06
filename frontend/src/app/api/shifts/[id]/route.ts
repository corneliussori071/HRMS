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
import { updateShiftSchema } from "@/lib/validations/shift";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Shift");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, department_id, name, start_time, end_time, is_active, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Shift");

  return successResponse(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Shift");

  const body: unknown = await request.json();
  const parsed = updateShiftSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shifts")
    .update(parsed.data)
    .eq("id", id)
    .select("id, department_id, name, start_time, end_time, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A shift with this name already exists in this department", 409);
    }
    return errorResponse("Failed to update shift", 500);
  }
  if (!data) return notFoundResponse("Shift");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Shift");

  const supabase = await createClient();

  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete shift", 500);

  return successResponse({ deleted: true });
}
