import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/api/auth";
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
    leave_type_id: searchParams.get("leave_type_id") || undefined,
  });
  if (!filterParsed.success) return validationErrorResponse(filterParsed.error);

  const { page, pageSize } = pageParsed.data;
  const filters = filterParsed.data;
  const { from, to } = getPaginationRange(page, pageSize);

  const supabase = await createClient();

  let query = supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type, leave_type_id, start_date, end_date, reason, status, approved_days, reviewer_id, reviewer_note, reviewed_at, created_at, updated_at, profiles!leave_requests_user_id_fkey(full_name)",
      { count: "exact" }
    );

  if (!hasPermission(auth, "review_leaves")) {
    query = query.eq("user_id", auth.userId);
  } else if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.leave_type_id) query = query.eq("leave_type_id", filters.leave_type_id);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return errorResponse("Failed to fetch leave requests", 500);

  return successResponse(buildPaginatedResult(data ?? [], count ?? 0, page, pageSize));
}

function countBusinessDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const current = new Date(s);
  while (current <= e) {
    count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const body: unknown = await request.json();
  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();
  const { leave_type_id, start_date, end_date, reason } = parsed.data;

  // 1. Get user profile (department_id, rank_id)
  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, rank_id")
    .eq("id", auth.userId)
    .single();

  if (!profile) return errorResponse("User profile not found", 404);

  // 2. Validate leave type exists, is active, and matches user department
  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("id, name, system_type, department_id, max_days_per_year, is_active")
    .eq("id", leave_type_id)
    .single();

  if (!leaveType) return errorResponse("Leave type not found", 404);
  if (!leaveType.is_active) return errorResponse("This leave type is currently inactive", 400);

  // Check department scope: if leave type is department-specific, user must be in that department
  if (leaveType.department_id && leaveType.department_id !== profile.department_id) {
    return errorResponse("This leave type is not available for your department", 403);
  }

  // 3. Calculate requested days
  const requestedDays = countBusinessDays(start_date, end_date);
  if (requestedDays <= 0) return errorResponse("Invalid date range", 400);

  // 4. Get allocation for user's rank (or fall back to max_days_per_year)
  let totalAllowedDays = leaveType.max_days_per_year;

  if (profile.rank_id) {
    const { data: rankAlloc } = await supabase
      .from("leave_allocations")
      .select("days_per_year")
      .eq("leave_type_id", leave_type_id)
      .eq("rank_id", profile.rank_id)
      .single();

    if (rankAlloc) {
      totalAllowedDays = rankAlloc.days_per_year;
    }
  }

  // 5. Calculate already used days this year (approved + pending)
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const { data: existingRequests } = await supabase
    .from("leave_requests")
    .select("start_date, end_date, status, approved_days")
    .eq("user_id", auth.userId)
    .eq("leave_type_id", leave_type_id)
    .in("status", ["approved", "pending"])
    .gte("start_date", yearStart)
    .lte("start_date", yearEnd);

  const usedDays = (existingRequests ?? []).reduce((sum, req) => {
    if (req.status === "approved" && req.approved_days !== null) {
      return sum + Number(req.approved_days);
    }
    return sum + countBusinessDays(req.start_date, req.end_date);
  }, 0);

  const remainingDays = totalAllowedDays - usedDays;

  if (requestedDays > remainingDays) {
    return errorResponse(
      `Insufficient leave balance. You have ${remainingDays} day(s) remaining for this leave type, but requested ${requestedDays} day(s).`,
      400
    );
  }

  // 6. Insert leave request
  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: auth.userId,
      leave_type: leaveType.name.toLowerCase().replace(/ /g, "_"),
      leave_type_id,
      start_date,
      end_date,
      reason,
    })
    .select(
      "id, user_id, leave_type, leave_type_id, start_date, end_date, reason, status, created_at, updated_at"
    )
    .single();

  if (error) return errorResponse("Failed to create leave request", 500);

  return successResponse(data, 201);
}
