import { PaginatedResponse, ApiSuccess } from "@/types/api";
import { OvertimeEntry } from "@/types/overtime";

const API_BASE = "/api";

interface OvertimeFilters {
  page?: number;
  pageSize?: number;
  user_id?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function fetchOvertime(filters: OvertimeFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return fetch(`${API_BASE}/overtime?${new URLSearchParams(params)}`).then(
    (res) => res.json() as Promise<ApiSuccess<PaginatedResponse<OvertimeEntry>>>
  );
}

export function fetchOvertimeById(id: string) {
  return fetch(`${API_BASE}/overtime/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<OvertimeEntry>>
  );
}

export function createOvertime(data: { date: string; hours: number; reason: string }) {
  return fetch(`${API_BASE}/overtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<OvertimeEntry>>);
}

export function reviewOvertime(
  id: string,
  data: { status: string; reviewer_note?: string | null }
) {
  return fetch(`${API_BASE}/overtime/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<OvertimeEntry>>);
}

export function deleteOvertime(id: string) {
  return fetch(`${API_BASE}/overtime/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}
