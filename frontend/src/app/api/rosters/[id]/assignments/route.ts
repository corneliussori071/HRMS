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

  // Fetch user profile for rank and hours/days limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("rank_id, pay_type, hours_per_week, days_per_week")
    .eq("id", auth.userId)
    .single();

  if (!profile) return errorResponse("User profile not found", 400);

  // Fetch shift details for hours calculation
  const { data: shift } = await supabase
    .from("shifts")
    .select("start_time, end_time, break_minutes")
    .eq("id", data.shift_id)
    .single();

  if (!shift) return errorResponse("Shift not found", 400);

  // Fetch all existing assignments for this roster on this date (for capacity checks)
  const { data: dateAssignments } = await supabase
    .from("roster_assignments")
    .select("user_id, shift_id")
    .eq("roster_id", rosterId)
    .eq("date", data.date)
    .neq("user_id", auth.userId);

  const othersOnDate = dateAssignments ?? [];

  // 1. Check shift staff capacity from roster_shift_configs
  const { data: shiftConfigs } = await supabase
    .from("roster_shift_configs")
    .select("required_count, date")
    .eq("roster_id", rosterId)
    .eq("shift_id", data.shift_id);

  if (shiftConfigs && shiftConfigs.length > 0) {
    const dateSpecific = shiftConfigs.find((c) => c.date === data.date);
    const global = shiftConfigs.find((c) => c.date === null);
    const effectiveConfig = dateSpecific ?? global;

    if (effectiveConfig) {
      const currentCount = othersOnDate.filter((a) => a.shift_id === data.shift_id).length;
      if (currentCount >= effectiveConfig.required_count) {
        return errorResponse(
          `Shift is full (${effectiveConfig.required_count} staff required)`,
          400
        );
      }
    }
  }

  // 2. Check rank capacity from roster_rank_configs
  if (profile.rank_id) {
    const { data: rankConfig } = await supabase
      .from("roster_rank_configs")
      .select("max_count")
      .eq("roster_id", rosterId)
      .eq("shift_id", data.shift_id)
      .eq("rank_id", profile.rank_id)
      .single();

    if (rankConfig) {
      // Count others with the same rank on this shift+date
      const othersOnShift = othersOnDate.filter((a) => a.shift_id === data.shift_id);
      const otherUserIds = othersOnShift.map((a) => a.user_id);

      if (otherUserIds.length > 0) {
        const { count: sameRankCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("id", otherUserIds)
          .eq("rank_id", profile.rank_id);

        if (sameRankCount !== null && sameRankCount >= rankConfig.max_count) {
          return errorResponse(
            `Rank capacity reached (${rankConfig.max_count} max for this rank)`,
            400
          );
        }
      }
    }
  }

  // 3. Check hours/days limits (rolling 7-day window)
  const targetDate = new Date(data.date + "T00:00:00");
  const windowDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    windowDates.push(d.toISOString().slice(0, 10));
  }

  const { data: windowAssignments } = await supabase
    .from("roster_assignments")
    .select("date, shift_id, shifts(start_time, end_time, break_minutes)")
    .eq("user_id", auth.userId)
    .in("date", windowDates)
    .not("shift_id", "is", null);

  interface WindowAssignment {
    date: string;
    shift_id: string;
    shifts: { start_time: string; end_time: string; break_minutes: number } | null;
  }
  const windowRows = (windowAssignments ?? []) as unknown as WindowAssignment[];

  if (profile.pay_type === "hourly") {
    const proposedHours = computeShiftHours(shift.start_time, shift.end_time, shift.break_minutes);
    let existingHours = 0;
    let shiftCount = 0;
    for (const wa of windowRows) {
      if (wa.date === data.date) continue; // skip current date (will be replaced)
      if (wa.shifts) {
        existingHours += computeShiftHours(wa.shifts.start_time, wa.shifts.end_time, wa.shifts.break_minutes);
        shiftCount += 1;
      }
    }
    const grandTotal = existingHours + proposedHours;
    const maxHours = profile.hours_per_week ?? 40;
    if (grandTotal > maxHours) {
      return errorResponse(
        `Would exceed weekly hours limit (${existingHours.toFixed(1)}h worked in ${shiftCount} shift${shiftCount !== 1 ? "s" : ""} + ${proposedHours.toFixed(1)}h proposed = ${grandTotal.toFixed(1)}h / ${maxHours}h)`,
        400
      );
    }
  } else {
    const daysWorked = new Set(
      windowRows
        .filter((a) => a.date !== data.date)
        .map((a) => a.date)
    );
    daysWorked.add(data.date);
    const maxDays = profile.days_per_week ?? 5;
    if (daysWorked.size > maxDays) {
      return errorResponse(
        `Would exceed weekly days limit (${daysWorked.size} / ${maxDays} days)`,
        400
      );
    }
  }

  // All checks passed — upsert the assignment
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

/**
 * Compute net working hours of a shift. Handles overnight shifts.
 */
function computeShiftHours(startTime: string, endTime: string, breakMinutes: number): number {
  const sParts = startTime.slice(0, 5).split(":");
  const eParts = endTime.slice(0, 5).split(":");
  const startMin = (parseInt(sParts[0], 10) || 0) * 60 + (parseInt(sParts[1], 10) || 0);
  let endMin = (parseInt(eParts[0], 10) || 0) * 60 + (parseInt(eParts[1], 10) || 0);
  if (endMin <= startMin) endMin += 1440;
  const netMinutes = (endMin - startMin) - (breakMinutes || 0);
  return Math.max(0, netMinutes / 60);
}
