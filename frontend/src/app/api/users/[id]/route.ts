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
import { updateProfileSchema, adminUpdateProfileSchema } from "@/lib/validations/profile";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("User");

  const isSelf = auth.userId === id;
  if (!isSelf && auth.role === "staff") return forbiddenResponse();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, department_id, avatar_url, phone, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("User");

  return successResponse(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("User");

  const isSelf = auth.userId === id;
  const isPrivileged = isAdminOrHr(auth.role);

  if (!isSelf && !isPrivileged) return forbiddenResponse();

  const body: unknown = await request.json();
  const schema = isPrivileged ? adminUpdateProfileSchema : updateProfileSchema;
  const parsed = schema.safeParse(body);

  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", id)
    .select("id, email, full_name, role, department_id, avatar_url, phone, created_at, updated_at")
    .single();

  if (error) return errorResponse("Failed to update user", 500);
  if (!data) return notFoundResponse("User");

  return successResponse(data);
}
