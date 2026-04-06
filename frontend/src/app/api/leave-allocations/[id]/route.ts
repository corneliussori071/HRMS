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
import { updateLeaveAllocationSchema } from "@/lib/validations/leave-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "leave_settings")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave allocation");

  const body: unknown = await request.json();
  const parsed = updateLeaveAllocationSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_allocations")
    .update(parsed.data)
    .eq("id", id)
    .select("id, leave_type_id, role, rank_id, days_per_year, hours_worked, hours_earned, created_at, updated_at")
    .single();

  if (error) return errorResponse("Failed to update leave allocation", 500);
  if (!data) return notFoundResponse("Leave allocation");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "leave_settings")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave allocation");

  const supabase = await createClient();

  const { error } = await supabase.from("leave_allocations").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete leave allocation", 500);

  return successResponse({ deleted: true });
}
