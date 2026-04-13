import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api/responses";
import { createRosterSchema, rosterFilterSchema } from "@/lib/validations/roster";
import { hasPermission } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;

  const filterParsed = rosterFilterSchema.safeParse({
    department_id: searchParams.get("department_id") || undefined,
    status: searchParams.get("status") || undefined,
  });
  if (!filterParsed.success) return validationErrorResponse(filterParsed.error);

  const filters = filterParsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("rosters")
    .select(
      "id, title, department_id, start_date, end_date, status, allow_self_scheduling, min_staff_per_shift, max_staff_per_shift, completion_date, created_by, created_at, updated_at, departments(id, name)"
    )
    .order("created_at", { ascending: false });

  if (filters.department_id) {
    query = query.eq("department_id", filters.department_id);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) return errorResponse("Failed to fetch rosters", 500);

  return successResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "create_roster")) return forbiddenResponse();

  const body: unknown = await request.json();
  const parsed = createRosterSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const {
    title,
    department_id,
    start_date,
    end_date,
    allow_self_scheduling,
    completion_date,
    min_staff_per_shift,
    max_staff_per_shift,
    shift_ids,
    staff_ids,
    assignments,
    shift_configs,
    rank_configs,
  } = parsed.data;

  const supabase = await createClient();

  const { data: roster, error: rosterError } = await supabase
    .from("rosters")
    .insert({
      title,
      department_id,
      start_date,
      end_date,
      allow_self_scheduling,
      completion_date: completion_date ?? null,
      min_staff_per_shift,
      max_staff_per_shift,
      created_by: auth.userId,
    })
    .select(
      "id, title, department_id, start_date, end_date, status, allow_self_scheduling, min_staff_per_shift, max_staff_per_shift, completion_date, created_by, created_at, updated_at"
    )
    .single();

  if (rosterError || !roster) {
    return errorResponse("Failed to create roster", 500);
  }

  const rosterShiftRows = shift_ids.map((shift_id) => ({
    roster_id: roster.id,
    shift_id,
  }));
  const { error: shiftError } = await supabase
    .from("roster_shifts")
    .insert(rosterShiftRows);

  if (shiftError) {
    await supabase.from("rosters").delete().eq("id", roster.id);
    return errorResponse("Failed to save roster shifts", 500);
  }

  const rosterStaffRows = staff_ids.map((user_id) => ({
    roster_id: roster.id,
    user_id,
    is_included: true,
  }));
  const { error: staffError } = await supabase
    .from("roster_staff")
    .insert(rosterStaffRows);

  if (staffError) {
    await supabase.from("rosters").delete().eq("id", roster.id);
    return errorResponse("Failed to save roster staff", 500);
  }

  const assignmentRows: {
    roster_id: string;
    user_id: string;
    date: string;
    shift_id: string | null;
    is_manual_override: boolean;
  }[] = [];

  for (const [date, userShifts] of Object.entries(assignments)) {
    for (const [user_id, shift_id] of Object.entries(userShifts)) {
      assignmentRows.push({
        roster_id: roster.id,
        user_id,
        date,
        shift_id,
        is_manual_override: false,
      });
    }
  }

  if (assignmentRows.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < assignmentRows.length; i += batchSize) {
      const batch = assignmentRows.slice(i, i + batchSize);
      const { error: assignError } = await supabase
        .from("roster_assignments")
        .insert(batch);

      if (assignError) {
        await supabase.from("rosters").delete().eq("id", roster.id);
        return errorResponse("Failed to save roster assignments", 500);
      }
    }
  }

  // Save shift configs (per-shift staffing requirements), deduplicated by shift+date
  if (shift_configs && shift_configs.length > 0) {
    const scMap = new Map<string, { shift_id: string; date: string | null; required_count: number }>();
    for (const sc of shift_configs) {
      const key = `${sc.shift_id}-${sc.date ?? "__null__"}`;
      scMap.set(key, sc);
    }
    const shiftConfigRows = Array.from(scMap.values()).map((sc) => {
      const row: { roster_id: string; shift_id: string; required_count: number; date?: string } = {
        roster_id: roster.id,
        shift_id: sc.shift_id,
        required_count: sc.required_count,
      };
      if (sc.date !== null) {
        row.date = sc.date;
      }
      return row;
    });
    const { error: scError } = await supabase
      .from("roster_shift_configs")
      .insert(shiftConfigRows);
    if (scError) {
      await supabase.from("rosters").delete().eq("id", roster.id);
      return errorResponse(`Failed to save shift configs: ${scError.message}`, 500);
    }
  }

  // Save rank configs (per-shift rank capacity limits), deduplicated by shift+rank
  if (rank_configs && rank_configs.length > 0) {
    const rcMap = new Map<string, { shift_id: string; rank_id: string; max_count: number }>();
    for (const rc of rank_configs) {
      rcMap.set(`${rc.shift_id}-${rc.rank_id}`, rc);
    }
    const rankConfigRows = Array.from(rcMap.values()).map((rc) => ({
      roster_id: roster.id,
      shift_id: rc.shift_id,
      rank_id: rc.rank_id,
      max_count: rc.max_count,
    }));
    const { error: rcError } = await supabase
      .from("roster_rank_configs")
      .insert(rankConfigRows);
    if (rcError) {
      await supabase.from("rosters").delete().eq("id", roster.id);
      return errorResponse(`Failed to save rank configs: ${rcError.message}`, 500);
    }
  }

  return successResponse(roster, 201);
}
