import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api/responses";
import { createLeaveAllocationSchema } from "@/lib/validations/leave-config";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const leaveTypeId = searchParams.get("leave_type_id");
  const role = searchParams.get("role");

  const supabase = await createClient();

  let query = supabase
    .from("leave_allocations")
    .select("id, leave_type_id, role, rank_id, days_per_year, hours_worked, hours_earned, created_at, updated_at")
    .order("role", { ascending: true });

  if (leaveTypeId) query = query.eq("leave_type_id", leaveTypeId);
  if (role) query = query.eq("role", role);

  const rankId = searchParams.get("rank_id");
  if (rankId) query = query.eq("rank_id", rankId);

  const { data, error } = await query;

  if (error) return errorResponse("Failed to fetch leave allocations", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "leave_settings")) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createLeaveAllocationSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const upsertConflict = parsed.data.rank_id ? "leave_type_id,rank_id" : "leave_type_id,role";

  const { data, error } = await supabase
    .from("leave_allocations")
    .upsert(parsed.data, { onConflict: upsertConflict })
    .select("id, leave_type_id, role, rank_id, days_per_year, hours_worked, hours_earned, created_at, updated_at")
    .single();

  if (error) return errorResponse("Failed to save leave allocation", 500);

  return successResponse(data, 201);
}
