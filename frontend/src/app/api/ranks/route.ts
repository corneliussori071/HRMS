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
import { createRankSchema } from "@/lib/validations/department-config";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const supabase = await createClient();
  const deptId = request.nextUrl.searchParams.get("department_id");

  let query = supabase
    .from("ranks")
    .select("id, department_id, name, level, description, is_active, created_at, updated_at")
    .order("level")
    .order("name");

  if (deptId) {
    query = query.eq("department_id", deptId);
  }

  const { data, error } = await query;
  if (error) return errorResponse("Failed to fetch ranks", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createRankSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranks")
    .insert(parsed.data)
    .select("id, department_id, name, level, description, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A rank with this name already exists in this department", 409);
    }
    return errorResponse("Failed to create rank", 500);
  }

  return successResponse(data, 201);
}
