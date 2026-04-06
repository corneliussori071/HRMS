import { ApiSuccess } from "@/types/api";
import { LeaveType, LeaveAllocation, LeaveBalance } from "@/types/leave-config";

const API_BASE = "/api";

export function fetchLeaveTypes() {
  return fetch(`${API_BASE}/leave-types`).then(
    (res) => res.json() as Promise<ApiSuccess<LeaveType[]>>
  );
}

export function createLeaveType(data: {
  name: string;
  description?: string | null;
  system_type: string;
  max_days_per_year: number;
  is_active?: boolean;
  requires_approval?: boolean;
}) {
  return fetch(`${API_BASE}/leave-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<LeaveType>>);
}

export function updateLeaveType(id: string, data: Record<string, unknown>) {
  return fetch(`${API_BASE}/leave-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<LeaveType>>);
}

export function deleteLeaveType(id: string) {
  return fetch(`${API_BASE}/leave-types/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}

export function fetchLeaveAllocations(leaveTypeId?: string, role?: string) {
  const params = new URLSearchParams();
  if (leaveTypeId) params.set("leave_type_id", leaveTypeId);
  if (role) params.set("role", role);
  const qs = params.toString();
  return fetch(`${API_BASE}/leave-allocations${qs ? `?${qs}` : ""}`).then(
    (res) => res.json() as Promise<ApiSuccess<LeaveAllocation[]>>
  );
}

export function saveLeaveAllocation(data: {
  leave_type_id: string;
  role: string;
  days_per_year: number;
}) {
  return fetch(`${API_BASE}/leave-allocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<LeaveAllocation>>);
}

export function deleteLeaveAllocation(id: string) {
  return fetch(`${API_BASE}/leave-allocations/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}

export function fetchLeaveBalances(userId?: string, year?: number) {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  if (year) params.set("year", String(year));
  const qs = params.toString();
  return fetch(`${API_BASE}/leave-balances${qs ? `?${qs}` : ""}`).then(
    (res) => res.json() as Promise<ApiSuccess<LeaveBalance[]>>
  );
}
