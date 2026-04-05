import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isAdminOrHr } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/responses";
import { paginationSchema } from "@/lib/validations/shared";
import { createAttendanceSchema, attendanceFilterSchema } from "@/lib/validations/attendance";
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

  const filterParsed = attendanceFilterSchema.safeParse({
    date: searchParams.get("date") || undefined,
    user_id: searchParams.get("user_id") || undefined,
    status: searchParams.get("status") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!filterParsed.success) return validationErrorResponse(filterParsed.error);

  const { page, pageSize } = pageParsed.data;
  const filters = filterParsed.data;
  const { from, to } = getPaginationRange(page, pageSize);

  const supabase = await createClient();

  let query = supabase
    .from("attendance")
    .select("id, user_id, date, check_in, check_out, status, notes, created_at", { count: "exact" });

  if (auth.role === "staff") {
    query = query.eq("user_id", auth.userId);
  } else if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters.date) query = query.eq("date", filters.date);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);

  const { data, error, count } = await query
    .order("date", { ascending: false })
    .range(from, to);

  if (error) return errorResponse("Failed to fetch attendance records", 500);

  return successResponse(buildPaginatedResult(data ?? [], count ?? 0, page, pageSize));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const body: unknown = await request.json();
  const parsed = createAttendanceSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const insertData = {
    user_id: auth.userId,
    ...parsed.data,
  };

  const { data, error } = await supabase
    .from("attendance")
    .insert(insertData)
    .select("id, user_id, date, check_in, check_out, status, notes, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("Attendance record already exists for this date", 409);
    }
    return errorResponse("Failed to create attendance record", 500);
  }

  return successResponse(data, 201);
}
