import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/responses";
import { paginationSchema } from "@/lib/validations/shared";
import { createLeaveRequestSchema, leaveFilterSchema } from "@/lib/validations/leave";
import { getPaginationRange, buildPaginatedResult } from "@/lib/api/pagination";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;

  const pageParsed = paginationSchema.safeParse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });
  if (!pageParsed.success) return errorResponse("Invalid pagination parameters");

  const filterParsed = leaveFilterSchema.safeParse({
    user_id: searchParams.get("user_id") || undefined,
    status: searchParams.get("status") || undefined,
    leave_type: searchParams.get("leave_type") || undefined,
  });
  if (!filterParsed.success) return validationErrorResponse(filterParsed.error);

  const { page, pageSize } = pageParsed.data;
  const filters = filterParsed.data;
  const { from, to } = getPaginationRange(page, pageSize);

  const supabase = await createClient();

  let query = supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type, start_date, end_date, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at",
      { count: "exact" }
    );

  if (auth.role === "staff") {
    query = query.eq("user_id", auth.userId);
  } else if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.leave_type) query = query.eq("leave_type", filters.leave_type);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return errorResponse("Failed to fetch leave requests", 500);

  return successResponse(buildPaginatedResult(data ?? [], count ?? 0, page, pageSize));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const body: unknown = await request.json();
  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: auth.userId,
      ...parsed.data,
    })
    .select(
      "id, user_id, leave_type, start_date, end_date, reason, status, created_at, updated_at"
    )
    .single();

  if (error) return errorResponse("Failed to create leave request", 500);

  return successResponse(data, 201);
}
