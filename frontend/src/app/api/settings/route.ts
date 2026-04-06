import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, isAdminOrHr } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api/responses";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value, updated_at");

  if (error) return errorResponse("Failed to fetch settings", 500);

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return successResponse(settings);
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();
  if (!isAdminOrHr(auth.role)) return forbiddenResponse();

  const body = await request.json() as Record<string, unknown>;

  if (!body || typeof body !== "object") {
    return errorResponse("Request body must be an object");
  }

  const supabase = await createClient();

  const entries = Object.entries(body);
  for (const [key, value] of entries) {
    const { error } = await supabase
      .from("system_settings")
      .upsert(
        { key, value: JSON.stringify(value), updated_by: auth.userId },
        { onConflict: "key" }
      );

    if (error) return errorResponse(`Failed to update setting: ${key}`, 500);
  }

  return successResponse({ updated: true });
}
