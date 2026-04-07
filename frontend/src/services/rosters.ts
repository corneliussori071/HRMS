import { ApiSuccess } from "@/types/api";
import { Roster, RosterAssignment } from "@/types/roster";

const API_BASE = "/api";

interface RosterFilters {
  department_id?: string;
  status?: string;
}

interface CreateRosterPayload {
  title: string;
  department_id: string;
  start_date: string;
  end_date: string;
  allow_self_scheduling: boolean;
  min_staff_per_shift: number;
  max_staff_per_shift: number;
  shift_ids: string[];
  staff_ids: string[];
  assignments: Record<string, Record<string, string | null>>;
}

interface UpdateAssignmentsPayload {
  assignments: {
    user_id: string;
    date: string;
    shift_id: string | null;
    is_manual_override: boolean;
  }[];
}

export function fetchRosters(filters: RosterFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.status) params.status = filters.status;

  return fetch(`${API_BASE}/rosters?${new URLSearchParams(params)}`).then(
    (res) => res.json() as Promise<ApiSuccess<Roster[]>>
  );
}

export function fetchRoster(id: string) {
  return fetch(`${API_BASE}/rosters/${id}`).then(
    (res) => res.json() as Promise<ApiSuccess<Roster & { assignments: RosterAssignment[] }>>
  );
}

export function createRoster(data: CreateRosterPayload) {
  return fetch(`${API_BASE}/rosters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Roster>>);
}

export function updateRoster(
  id: string,
  data: { title?: string; status?: string; allow_self_scheduling?: boolean; min_staff_per_shift?: number; max_staff_per_shift?: number }
) {
  return fetch(`${API_BASE}/rosters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<Roster>>);
}

export function updateRosterAssignments(id: string, data: UpdateAssignmentsPayload) {
  return fetch(`${API_BASE}/rosters/${id}/assignments`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ApiSuccess<{ updated: number }>>);
}

export function deleteRoster(id: string) {
  return fetch(`${API_BASE}/rosters/${id}`, { method: "DELETE" }).then(
    (res) => res.json() as Promise<ApiSuccess<{ deleted: boolean }>>
  );
}

export function fetchMyShifts(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return fetch(`${API_BASE}/rosters/my-shifts?${new URLSearchParams(params)}`).then(
    (res) =>
      res.json() as Promise<
        ApiSuccess<
          {
            date: string;
            shift_name: string;
            shift_key: string;
            shift_start: string;
            shift_end: string;
            roster_title: string;
            department_name: string;
          }[]
        >
      >
  );
}
