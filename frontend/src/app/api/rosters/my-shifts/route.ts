import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createClient();

  // Fetch assigned shifts from published rosters
  let query = supabase
    .from("roster_assignments")
    .select(
      `
      date,
      shift_id,
      shifts(name, short_key, start_time, end_time),
      rosters!inner(id, title, status, allow_self_scheduling, department_id, start_date, end_date, min_staff_per_shift, max_staff_per_shift, departments(name))
    `
    )
    .eq("user_id", auth.userId)
    .eq("rosters.status", "published")
    .order("date", { ascending: true });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;

  if (error) return errorResponse("Failed to fetch shift assignments", 500);

  interface RawAssignment {
    date: string;
    shift_id: string | null;
    shifts: { name: string; short_key: string; start_time: string; end_time: string } | null;
    rosters: {
      id: string;
      title: string;
      status: string;
      allow_self_scheduling: boolean;
      department_id: string;
      start_date: string;
      end_date: string;
      min_staff_per_shift: number;
      max_staff_per_shift: number;
      departments: { name: string } | null;
    } | null;
  }

  const assignments = (data as unknown as RawAssignment[])
    .filter((r) => r.shift_id !== null)
    .map((r) => ({
      date: r.date,
      shift_name: r.shifts?.name ?? "",
      shift_key: r.shifts?.short_key ?? "",
      shift_start: r.shifts?.start_time ?? "",
      shift_end: r.shifts?.end_time ?? "",
      roster_title: r.rosters?.title ?? "",
      department_name: r.rosters?.departments?.name ?? "",
    }));

  // Fetch self-scheduling rosters that include this user
  const { data: selfScheduleRosters, error: ssError } = await supabase
    .from("roster_staff")
    .select(
      `
      roster_id,
      rosters!inner(
        id, title, status, allow_self_scheduling, department_id,
        start_date, end_date,
        min_staff_per_shift, max_staff_per_shift,
        departments(name),
        roster_shifts(shift_id, shifts(id, name, short_key, start_time, end_time, break_minutes, min_hours_per_week, max_hours_per_week))
      )
    `
    )
    .eq("user_id", auth.userId)
    .eq("is_included", true)
    .eq("rosters.status", "published")
    .eq("rosters.allow_self_scheduling", true);

  interface SelfScheduleRaw {
    roster_id: string;
    rosters: {
      id: string;
      title: string;
      status: string;
      allow_self_scheduling: boolean;
      department_id: string;
      start_date: string;
      end_date: string;
      min_staff_per_shift: number;
      max_staff_per_shift: number;
      departments: { name: string } | null;
      roster_shifts: {
        shift_id: string;
        shifts: {
          id: string;
          name: string;
          short_key: string;
          start_time: string;
          end_time: string;
          break_minutes: number;
          min_hours_per_week: number;
          max_hours_per_week: number;
        } | null;
      }[];
    } | null;
  }

  const selfScheduleData = !ssError && selfScheduleRosters
    ? (selfScheduleRosters as unknown as SelfScheduleRaw[])
        .filter((r) => r.rosters)
        .map((r) => ({
          roster_id: r.rosters!.id,
          title: r.rosters!.title,
          department_name: r.rosters!.departments?.name ?? "",
          start_date: r.rosters!.start_date,
          end_date: r.rosters!.end_date,
          min_staff_per_shift: r.rosters!.min_staff_per_shift,
          max_staff_per_shift: r.rosters!.max_staff_per_shift,
          shifts: r.rosters!.roster_shifts
            .filter((rs) => rs.shifts)
            .map((rs) => rs.shifts!),
        }))
    : [];

  return successResponse({
    assignments,
    self_schedule_rosters: selfScheduleData,
  });
}
