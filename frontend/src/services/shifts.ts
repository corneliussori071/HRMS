import { ApiSuccess } from "@/types/api";
import { Shift } from "@/types/shift";

const API_BASE = "/api";

export function fetchShifts(departmentId?: string) {
  const params = departmentId ? `?department_id=${departmentId}` : "";
  return fetch(`${API_BASE}/shifts${params}`).then(
    (res) => res.json() as Promise<ApiSuccess<Shift[]>>
  );
}

export function fetchShift(id: string) {
  return fetch(`${API_BASE}/shifts/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<Shift>>
  );
}

export function createShift(data: {
  department_id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}) {
  return fetch(`${API_BASE}/shifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Shift>>);
}

export function updateShift(
  id: string,
  data: { name?: string; start_time?: string; end_time?: string; is_active?: boolean }
) {
  return fetch(`${API_BASE}/shifts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Shift>>);
}

export function deleteShift(id: string) {
  return fetch(`${API_BASE}/shifts/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}
