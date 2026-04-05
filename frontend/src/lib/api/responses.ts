import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(message: string, status = 400, details?: string) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function validationErrorResponse(error: ZodError<unknown>) {
  const messages = error.issues.map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`);
  return errorResponse("Validation failed", 400, messages.join("; "));
}

export function unauthorizedResponse() {
  return errorResponse("Authentication required", 401);
}

export function forbiddenResponse() {
  return errorResponse("Insufficient permissions", 403);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}
