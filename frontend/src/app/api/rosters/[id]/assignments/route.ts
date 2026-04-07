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
import { updateAssignmentsSchema, selfScheduleAssignmentSchema } from "@/lib/validations/roster";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Roster");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roster_assignments")
    .select("id, roster_id, user_id, date, shift_id, is_manual_override, created_at, updated_at")
    .eq("roster_id", id)
    .order("date", { ascending: true });

  if (error) return errorResponse("Failed to fetch assignments", 500);

  return successResponse(data ?? []);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Roster");

  const body: unknown = await request.json();

  // Check if this is a self-schedule request
  const selfScheduleResult = selfScheduleAssignmentSchema.safeParse(body);
  if (selfScheduleResult.success) {
    return handleSelfSchedule(auth, id, selfScheduleResult.data);
  }

  // Bulk update path - requires create_roster permission
  if (!hasPermission(auth, "create_roster")) return forbiddenResponse();

  const parsed = updateAssignmentsSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data: roster } = await supabase
    .from("rosters")
    .select("id")
    .eq("id", id)
    .single();

  if (!roster) return notFoundResponse("Roster");

  let updatedCount = 0;

  for (const assignment of parsed.data.assignments) {
    const { error } = await supabase
      .from("roster_assignments")
      .upsert(
        {
          roster_id: id,
          user_id: assignment.user_id,
          date: assignment.date,
          shift_id: assignment.shift_id,
          is_manual_override: assignment.is_manual_override,
        },
        { onConflict: "roster_id,user_id,date" }
      );

    if (!error) updatedCount += 1;
  }

  return successResponse({ updated: updatedCount });
}

async function handleSelfSchedule(
  auth: { userId: string },
  rosterId: string,
  data: { user_id: string; date: string; shift_id: string }
) {
  // User can only self-schedule for themselves
  if (data.user_id !== auth.userId) return forbiddenResponse();

  const supabase = await createClient();

  // Verify roster exists, is published, and has self-scheduling enabled
  const { data: roster } = await supabase
    .from("rosters")
    .select("id, allow_self_scheduling, status, start_date, end_date, min_staff_per_shift, max_staff_per_shift")
    .eq("id", rosterId)
    .single();

  if (!roster) return notFoundResponse("Roster");
  if (!roster.allow_self_scheduling) return forbiddenResponse();
  if (roster.status !== "published") return errorResponse("Roster is not published", 400);

  // Verify date is within roster range
  if (data.date < roster.start_date || data.date > roster.end_date) {
    return errorResponse("Date is outside the roster period", 400);
  }

  // Verify user is included in this roster
  const { data: staffEntry } = await supabase
    .from("roster_staff")
    .select("id")
    .eq("roster_id", rosterId)
    .eq("user_id", auth.userId)
    .eq("is_included", true)
    .single();

  if (!staffEntry) return forbiddenResponse();

  // Verify the shift is part of this roster
  const { data: rosterShift } = await supabase
    .from("roster_shifts")
    .select("id")
    .eq("roster_id", rosterId)
    .eq("shift_id", data.shift_id)
    .single();

  if (!rosterShift) return errorResponse("Shift is not available in this roster", 400);

  // Check that the shift isn't at max capacity for this date
  const { count } = await supabase
    .from("roster_assignments")
    .select("id", { count: "exact", head: true })
    .eq("roster_id", rosterId)
    .eq("date", data.date)
    .eq("shift_id", data.shift_id)
    .neq("user_id", auth.userId);

  if (count !== null && count >= roster.max_staff_per_shift) {
    return errorResponse("This shift is already at maximum capacity for this date", 400);
  }

  // Upsert the assignment
  const { error } = await supabase
    .from("roster_assignments")
    .upsert(
      {
        roster_id: rosterId,
        user_id: auth.userId,
        date: data.date,
        shift_id: data.shift_id,
        is_manual_override: false,
      },
      { onConflict: "roster_id,user_id,date" }
    );

  if (error) return errorResponse("Failed to save assignment", 500);

  return successResponse({ updated: 1 });
}
