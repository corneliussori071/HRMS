import { PaginatedResponse, ApiSuccess } from "@/types/api";
import { Attendance } from "@/types/attendance";

const API_BASE = "/api";

interface AttendanceFilters {
  page?: number;
  pageSize?: number;
  date?: string;
  user_id?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function fetchAttendance(filters: AttendanceFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.page) params.page = String(filters.page);
  if (filters.pageSize) params.pageSize = String(filters.pageSize);
  if (filters.date) params.date = filters.date;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return fetch(`${API_BASE}/attendance?${new URLSearchParams(params)}`).then(
    (res) => res.json() as Promise<ApiSuccess<PaginatedResponse<Attendance>>>
  );
}

export function fetchAttendanceById(id: string) {
  return fetch(`${API_BASE}/attendance/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<Attendance>>
  );
}

export function createAttendance(data: {
  date: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  notes?: string | null;
}) {
  return fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Attendance>>);
}

export function updateAttendance(id: string, data: Record<string, unknown>) {
  return fetch(`${API_BASE}/attendance/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Attendance>>);
}

export function deleteAttendance(id: string) {
  return fetch(`${API_BASE}/attendance/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}
