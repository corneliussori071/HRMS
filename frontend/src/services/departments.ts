import { ApiSuccess } from "@/types/api";
import { Department } from "@/types/department";

const API_BASE = "/api";

export function fetchDepartments() {
  return fetch(`${API_BASE}/departments`).then(
    (res) => res.json() as Promise<ApiSuccess<Department[]>>
  );
}

export function fetchDepartment(id: string) {
  return fetch(`${API_BASE}/departments/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<Department>>
  );
}

export function createDepartment(data: { name: string; description?: string | null }) {
  return fetch(`${API_BASE}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Department>>);
}

export function updateDepartment(id: string, data: { name?: string; description?: string | null }) {
  return fetch(`${API_BASE}/departments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Department>>);
}

export function deleteDepartment(id: string) {
  return fetch(`${API_BASE}/departments/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}
