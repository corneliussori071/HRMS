import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isManagerOrAbove } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id") || auth.userId;
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  if (userId !== auth.userId && !isManagerOrAbove(auth.role)) {
    return errorResponse("Insufficient permissions", 403);
  }

  const supabase = await createClient();

  const { data: balances, error } = await supabase
    .from("leave_balances")
    .select("id, user_id, leave_type_id, year, used_days, adjustment_days, created_at, updated_at")
    .eq("user_id", userId)
    .eq("year", year);

  if (error) return errorResponse("Failed to fetch leave balances", 500);

  return successResponse(balances ?? []);
}
