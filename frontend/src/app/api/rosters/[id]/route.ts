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
import { updateRosterSchema } from "@/lib/validations/roster";

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

  const { data: roster, error } = await supabase
    .from("rosters")
    .select(
      "id, title, department_id, start_date, end_date, status, allow_self_scheduling, min_staff_per_shift, max_staff_per_shift, created_by, created_at, updated_at, departments(id, name)"
    )
    .eq("id", id)
    .single();

  if (error || !roster) return notFoundResponse("Roster");

  const [
    { data: rosterShifts },
    { data: rosterStaff },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("roster_shifts")
      .select("shift_id, shifts(id, name, short_key, start_time, end_time, break_minutes)")
      .eq("roster_id", id),
    supabase
      .from("roster_staff")
      .select("user_id, is_included, profiles(id, full_name, ranks(name))")
      .eq("roster_id", id),
    supabase
      .from("roster_assignments")
      .select("id, user_id, date, shift_id, is_manual_override")
      .eq("roster_id", id)
      .order("date", { ascending: true }),
  ]);

  return successResponse({
    ...roster,
    roster_shifts: rosterShifts ?? [],
    roster_staff: rosterStaff ?? [],
    assignments: assignments ?? [],
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "create_roster")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Roster");

  const body: unknown = await request.json();
  const parsed = updateRosterSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rosters")
    .update(parsed.data)
    .eq("id", id)
    .select(
      "id, title, department_id, start_date, end_date, status, allow_self_scheduling, min_staff_per_shift, max_staff_per_shift, created_by, created_at, updated_at"
    )
    .single();

  if (error) return errorResponse("Failed to update roster", 500);
  if (!data) return notFoundResponse("Roster");

  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "create_roster")) return forbiddenResponse();

  const { id } = await params;
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return notFoundResponse("Roster");

  const supabase = await createClient();

  const { error } = await supabase.from("rosters").delete().eq("id", id);

  if (error) return errorResponse("Failed to delete roster", 500);

  return successResponse({ deleted: true });
}
