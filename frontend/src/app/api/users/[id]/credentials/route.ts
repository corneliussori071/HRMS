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
import { uuidSchema } from "@/lib/validations/shared";
import { updateCredentialsSchema } from "@/lib/validations/user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return errorResponse("Invalid user ID");

  const body: unknown = await request.json();
  const parsed = updateCredentialsSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const updatePayload: Record<string, string> = {};
  if (parsed.data.email) updatePayload.email = parsed.data.email;
  if (parsed.data.password) updatePayload.password = parsed.data.password;

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse("No credentials to update");
  }

  const { error } = await supabase.auth.admin.updateUserById(id, updatePayload);

  if (error) {
    return errorResponse(error.message, 400);
  }

  if (parsed.data.email) {
    await supabase
      .from("profiles")
      .update({ email: parsed.data.email })
      .eq("id", id);
  }

  return successResponse({ updated: true });
}
