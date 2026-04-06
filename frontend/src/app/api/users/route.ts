import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api/responses";
import { paginationSchema } from "@/lib/validations/shared";
import { getPaginationRange, buildPaginatedResult } from "@/lib/api/pagination";
import { createUserSchema, csvRowSchema } from "@/lib/validations/user";
import { z } from "zod";

const LIST_SELECT = `
  id, email, full_name, role, department_id, phone,
  rank_id, staffing_category_id, date_of_employment, status,
  created_at, updated_at,
  departments(id, name),
  ranks(id, name),
  staffing_categories(id, name)
`.replace(/\n/g, "");

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "users_page")) return forbiddenResponse();

  const searchParams = request.nextUrl.searchParams;
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  if (!parsed.success) {
    return errorResponse("Invalid pagination parameters");
  }

  const { page, pageSize } = parsed.data;
  const { from, to } = getPaginationRange(page, pageSize);

  const supabase = await createClient();

  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("profiles")
    .select(LIST_SELECT)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return errorResponse("Failed to fetch users", 500);
  }

  return successResponse(buildPaginatedResult(data, count ?? 0, page, pageSize));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!hasPermission(auth, "manage_users")) return forbiddenResponse();

  const body: unknown = await request.json();

  const isBulk = Array.isArray(body);

  if (isBulk) {
    const rowsSchema = z.array(csvRowSchema).min(1).max(500);
    const parsed = rowsSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const supabase = await createClient();

    const { data: departments } = await supabase
      .from("departments")
      .select("id, name");
    const deptMap = new Map((departments ?? []).map((d: { id: string; name: string }) => [d.name.toLowerCase(), d.id]));

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const row of parsed.data) {
      const deptId = row.department ? (deptMap.get(row.department.toLowerCase()) ?? null) : null;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: row.email,
        password: "TempPass123!",
        email_confirm: true,
        user_metadata: { full_name: row.full_name },
      });

      if (authError || !authData.user) {
        results.push({ email: row.email, success: false, error: authError?.message ?? "Failed to create auth user" });
        continue;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: row.full_name,
          email: row.email,
          role: row.role,
          department_id: deptId,
          phone: row.phone ?? null,
          date_of_employment: row.date_of_employment ?? null,
          gender: row.gender ?? null,
          employment_type: row.employment_type,
          pay_type: row.pay_type,
          pay_rate: row.pay_rate,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        results.push({ email: row.email, success: false, error: profileError.message });
      } else {
        results.push({ email: row.email, success: true });
      }
    }

    return successResponse(results, 201);
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { email, password, ...profileData } = parsed.data;

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: profileData.full_name },
  });

  if (authError || !authData.user) {
    return errorResponse(authError?.message ?? "Failed to create user", 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      ...profileData,
      email,
    })
    .eq("id", authData.user.id)
    .select("id, email, full_name, role, department_id, status, created_at")
    .single();

  if (profileError) {
    return errorResponse("User created but profile update failed: " + profileError.message, 500);
  }

  return successResponse(profile, 201);
}
