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
import { updateAttendanceSchema } from "@/lib/validations/attendance";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Attendance record");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, user_id, date, check_in, check_out, status, notes, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Attendance record");

  if (auth.role === "staff" && data.user_id !== auth.userId) {
    return forbiddenResponse();
  }

  return successResponse(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Attendance record");

  const body: unknown = await request.json();
  const parsed = updateAttendanceSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("attendance")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing) return notFoundResponse("Attendance record");
  if (auth.role === "staff" && existing.user_id !== auth.userId) {
    return forbiddenResponse();
  }

  const { data, error } = await supabase
    .from("attendance")
    .update(parsed.data)
    .eq("id", id)
    .select("id, user_id, date, check_in, check_out, status, notes, created_at")
    .single();

  if (error) return errorResponse("Failed to update attendance record", 500);

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Attendance record");

  const supabase = await createClient();
  const { error } = await supabase.from("attendance").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete attendance record", 500);

  return successResponse({ deleted: true });
}
