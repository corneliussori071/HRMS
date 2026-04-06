import { StaffingCategory, Rank } from "@/types/department-config";

interface ApiResponse<T> {
  data: T;
}

export function fetchCategories(departmentId?: string) {
  const url = departmentId
    ? `/api/staffing-categories?department_id=${departmentId}`
    : "/api/staffing-categories";
  return fetch(url).then((r) => r.json() as Promise<ApiResponse<StaffingCategory[]>>);
}

export function createCategory(data: { department_id: string; name: string; description?: string | null }) {
  return fetch("/api/staffing-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json() as Promise<ApiResponse<StaffingCategory>>);
}

export function updateCategory(id: string, data: { name?: string; description?: string | null; is_active?: boolean }) {
  return fetch(`/api/staffing-categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json() as Promise<ApiResponse<StaffingCategory>>);
}

export function deleteCategory(id: string) {
  return fetch(`/api/staffing-categories/${id}`, { method: "DELETE" });
}

export function fetchRanks(departmentId?: string) {
  const url = departmentId
    ? `/api/ranks?department_id=${departmentId}`
    : "/api/ranks";
  return fetch(url).then((r) => r.json() as Promise<ApiResponse<Rank[]>>);
}

export function createRank(data: { department_id: string; name: string; level?: number; description?: string | null }) {
  return fetch("/api/ranks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json() as Promise<ApiResponse<Rank>>);
}

export function updateRank(id: string, data: { name?: string; level?: number; description?: string | null; is_active?: boolean }) {
  return fetch(`/api/ranks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json() as Promise<ApiResponse<Rank>>);
}

export function deleteRank(id: string) {
  return fetch(`/api/ranks/${id}`, { method: "DELETE" });
}
