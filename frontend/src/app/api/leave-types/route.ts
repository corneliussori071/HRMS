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
import { createLeaveTypeSchema } from "@/lib/validations/leave-config";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_types")
    .select("id, name, description, system_type, department_id, max_days_per_year, is_active, requires_approval, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) return errorResponse("Failed to fetch leave types", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createLeaveTypeSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_types")
    .insert(parsed.data)
    .select("id, name, description, system_type, department_id, max_days_per_year, is_active, requires_approval, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A leave type with this name already exists", 409);
    }
    return errorResponse("Failed to create leave type", 500);
  }

  return successResponse(data, 201);
}
