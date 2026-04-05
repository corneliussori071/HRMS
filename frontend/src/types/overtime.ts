import { RequestStatus } from "./leave";

export interface OvertimeEntry {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  reason: string;
  status: RequestStatus;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}
