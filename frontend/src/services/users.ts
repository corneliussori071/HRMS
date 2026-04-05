import { PaginatedResponse, ApiSuccess } from "@/types/api";

const API_BASE = "/api";

interface FetchOptions {
  method?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const errorBody = json as { error: string; details?: string };
    throw new Error(errorBody.error || "Request failed");
  }

  return json as T;
}

export function fetchUsers(page = 1, pageSize = 20) {
  return apiFetch<ApiSuccess<PaginatedResponse<Record<string, unknown>>>>("/users", {
    params: { page: String(page), pageSize: String(pageSize) },
  });
}

export function fetchUser(id: string) {
  return apiFetch<ApiSuccess<Record<string, unknown>>>(`/users/${id}`);
}

export function updateUser(id: string, data: Record<string, unknown>) {
  return apiFetch<ApiSuccess<Record<string, unknown>>>(`/users/${id}`, {
    method: "PUT",
    body: data,
  });
}
