import { ApiSuccess } from "@/types/api";

const API_BASE = "/api";

export function fetchSettings() {
  return fetch(`${API_BASE}/settings`).then(
    (res) => res.json() as Promise<ApiSuccess<Record<string, unknown>>>
  );
}

export function updateSettings(data: Record<string, unknown>) {
  return fetch(`${API_BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<{ updated: boolean }>>);
}
