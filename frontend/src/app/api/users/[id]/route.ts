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
import { updateProfileSchema, adminUpdateProfileSchema } from "@/lib/validations/profile";

const PROFILE_SELECT = [
  "id", "email", "full_name", "role", "department_id", "avatar_url", "phone",
  "rank_id", "staffing_category_id", "shift_id",
  "date_of_birth", "gender", "address",
  "emergency_contact_name", "emergency_contact_phone",
  "date_of_employment", "employment_type",
  "pay_type", "pay_rate",
  "bank_name", "bank_account_number", "tax_id",
  "status", "created_at", "updated_at",
  "departments(id, name)",
  "ranks(id, name)",
  "staffing_categories(id, name)",
  "shifts(id, name)",
].join(", ");

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
  if (!isSelf && !hasPermission(auth, "users_page")) return forbiddenResponse();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
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
  const isPrivileged = hasPermission(auth, "manage_users");

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
    .select(PROFILE_SELECT)
    .single();

  if (error) return errorResponse("Failed to update user", 500);
  if (!data) return notFoundResponse("User");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "manage_users")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("User");

  if (auth.userId === id) {
    return errorResponse("Cannot delete your own account", 400);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete user", 500);

  return successResponse({ deleted: true });
}
