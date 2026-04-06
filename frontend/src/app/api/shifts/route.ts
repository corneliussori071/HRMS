import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isAdminOrHr } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api/responses";
import { createShiftSchema } from "@/lib/validations/shift";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const departmentId = searchParams.get("department_id");

  const supabase = await createClient();

  let query = supabase
    .from("shifts")
    .select("id, department_id, name, short_key, start_time, end_time, break_minutes, min_hours_per_week, max_hours_per_week, is_active, created_at, updated_at")
    .order("name", { ascending: true });

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query;

  if (error) return errorResponse("Failed to fetch shifts", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createShiftSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shifts")
    .insert(parsed.data)
    .select("id, department_id, name, short_key, start_time, end_time, break_minutes, min_hours_per_week, max_hours_per_week, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A shift with this name already exists in this department", 409);
    }
    return errorResponse("Failed to create shift", 500);
  }

  return successResponse(data, 201);
}
