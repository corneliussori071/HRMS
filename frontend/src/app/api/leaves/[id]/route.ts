import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isAdminOrHr, isManagerOrAbove } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/api/responses";
import { uuidSchema } from "@/lib/validations/shared";
import { reviewLeaveRequestSchema } from "@/lib/validations/leave";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave request");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type, start_date, end_date, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Leave request");

  if (auth.role === "staff" && data.user_id !== auth.userId) {
    return forbiddenResponse();
  }

  return successResponse(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isManagerOrAbove(auth.role)) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave request");

  const body: unknown = await request.json();
  const parsed = reviewLeaveRequestSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("leave_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return notFoundResponse("Leave request");
  if (existing.status !== "pending") {
    return errorResponse("Only pending requests can be reviewed", 400);
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: parsed.data.status,
      reviewer_id: auth.userId,
      reviewer_note: parsed.data.reviewer_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, user_id, leave_type, start_date, end_date, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at"
    )
    .single();

  if (error) return errorResponse("Failed to review leave request", 500);

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Leave request");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("leave_requests")
    .select("user_id, status")
    .eq("id", id)
    .single();

  if (!existing) return notFoundResponse("Leave request");

  const canDelete =
    isAdminOrHr(auth.role) ||
    (existing.user_id === auth.userId && existing.status === "pending");

  if (!canDelete) return forbiddenResponse();

  const { error } = await supabase.from("leave_requests").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete leave request", 500);

  return successResponse({ deleted: true });
}
