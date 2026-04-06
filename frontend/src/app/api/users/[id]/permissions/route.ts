import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api/responses";
import { updatePermissionsSchema } from "@/lib/validations/permission";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_permissions")
    .select("id, user_id, permission, granted_by, created_at")
    .eq("user_id", id)
    .order("permission");

  if (error) {
    return errorResponse("Failed to fetch permissions", 500);
  }

  return successResponse(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;

  const supabase = await createClient();

  // Check caller has manage_users permission
  const { data: callerPerms } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("user_id", auth.userId);

  const callerPermissions = (callerPerms ?? []).map((p) => p.permission);
  if (!callerPermissions.includes("manage_users")) {
    return forbiddenResponse();
  }

  // Verify target user exists
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .single();

  if (!targetUser) return notFoundResponse("User");

  const body: unknown = await request.json();
  const parsed = updatePermissionsSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { permissions: newPermissions } = parsed.data;

  // Get current permissions for the target user
  const { data: currentPerms } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("user_id", id);

  const currentSet = new Set((currentPerms ?? []).map((p) => p.permission));
  const newSet = new Set(newPermissions);

  // Permissions to add
  const toAdd = newPermissions.filter((p) => !currentSet.has(p));
  // Permissions to remove
  const toRemove = [...currentSet].filter((p) => !newSet.has(p));

  if (toRemove.length > 0) {
    const { error: delError } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", id)
      .in("permission", toRemove);

    if (delError) {
      return errorResponse("Failed to remove permissions: " + delError.message, 500);
    }
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map((permission) => ({
      user_id: id,
      permission,
      granted_by: auth.userId,
    }));

    const { error: insertError } = await supabase
      .from("user_permissions")
      .insert(rows);

    if (insertError) {
      return errorResponse("Failed to add permissions: " + insertError.message, 500);
    }
  }

  // Return updated permissions
  const { data: updated } = await supabase
    .from("user_permissions")
    .select("id, user_id, permission, granted_by, created_at")
    .eq("user_id", id)
    .order("permission");

  return successResponse(updated);
}
