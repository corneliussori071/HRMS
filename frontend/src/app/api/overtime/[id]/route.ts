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
import { reviewOvertimeSchema } from "@/lib/validations/overtime";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Overtime record");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("overtime")
    .select(
      "id, user_id, date, hours, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) return notFoundResponse("Overtime record");

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
  if (!idResult.success) return notFoundResponse("Overtime record");

  const body: unknown = await request.json();
  const parsed = reviewOvertimeSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("overtime")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return notFoundResponse("Overtime record");
  if (existing.status !== "pending") {
    return errorResponse("Only pending records can be reviewed", 400);
  }

  const { data, error } = await supabase
    .from("overtime")
    .update({
      status: parsed.data.status,
      reviewer_id: auth.userId,
      reviewer_note: parsed.data.reviewer_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, user_id, date, hours, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at"
    )
    .single();

  if (error) return errorResponse("Failed to review overtime record", 500);

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Overtime record");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("overtime")
    .select("user_id, status")
    .eq("id", id)
    .single();

  if (!existing) return notFoundResponse("Overtime record");

  const canDelete =
    isAdminOrHr(auth.role) ||
    (existing.user_id === auth.userId && existing.status === "pending");

  if (!canDelete) return forbiddenResponse();

  const { error } = await supabase.from("overtime").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete overtime record", 500);

  return successResponse({ deleted: true });
}
