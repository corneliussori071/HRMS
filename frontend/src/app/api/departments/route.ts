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
import { createDepartmentSchema } from "@/lib/validations/department";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("id, name, description, created_at")
    .order("name", { ascending: true });

  if (error) return errorResponse("Failed to fetch departments", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .insert(parsed.data)
    .select("id, name, description, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("A department with this name already exists", 409);
    }
    return errorResponse("Failed to create department", 500);
  }

  return successResponse(data, 201);
}
