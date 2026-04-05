import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isManagerOrAbove } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api/responses";
import { paginationSchema } from "@/lib/validations/shared";
import { getPaginationRange, buildPaginatedResult } from "@/lib/api/pagination";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isManagerOrAbove(auth.role)) return forbiddenResponse();

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
    .select("id, email, full_name, role, department_id, phone, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return errorResponse("Failed to fetch users", 500);
  }

  return successResponse(buildPaginatedResult(data, count ?? 0, page, pageSize));
}
