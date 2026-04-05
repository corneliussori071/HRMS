import { PaginatedResponse, ApiSuccess } from "@/types/api";
import { LeaveRequest } from "@/types/leave";

const API_BASE = "/api";

interface LeaveFilters {
  page?: number;
  pageSize?: number;
  user_id?: string;
  status?: string;
  leave_type?: string;
}

export function fetchLeaves(filters: LeaveFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.status) params.status = filters.status;
  if (filters.leave_type) params.leave_type = filters.leave_type;

  return fetch(`${API_BASE}/leaves?${new URLSearchParams(params)}`).then(
    (res) => res.json() as Promise<ApiSuccess<PaginatedResponse<LeaveRequest>>>
  );
}

export function fetchLeaveById(id: string) {
  return fetch(`${API_BASE}/leaves/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<LeaveRequest>>
  );
}

export function createLeave(data: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}) {
  return fetch(`${API_BASE}/leaves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<LeaveRequest>>);
}

export function reviewLeave(id: string, data: { status: string; reviewer_note?: string | null }) {
  return fetch(`${API_BASE}/leaves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<LeaveRequest>>);
}

export function deleteLeave(id: string) {
  return fetch(`${API_BASE}/leaves/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}
