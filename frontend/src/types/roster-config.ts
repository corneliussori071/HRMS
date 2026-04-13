export interface RosterShiftConfig {
  id: string;
  roster_id: string;
  shift_id: string;
  date: string | null;
  required_count: number;
}

export interface RosterRankConfig {
  id: string;
  roster_id: string;
  shift_id: string;
  rank_id: string;
  max_count: number;
}

export interface ShiftSwapRequest {
  id: string;
  roster_id: string;
  requester_id: string;
  target_id: string;
  date: string;
  requester_shift_id: string | null;
  target_shift_id: string | null;
  status: SwapStatus;
  created_at: string;
  updated_at: string;
}

export type SwapStatus = "pending" | "accepted" | "rejected" | "approved" | "declined";

export interface ShiftConfigEntry {
  shiftId: string;
  date: string | null;
  requiredCount: number;
}

export interface RankConfigEntry {
  shiftId: string;
  rankId: string;
  maxCount: number;
}

export interface RosterConfigPayload {
  shiftConfigs: ShiftConfigEntry[];
  rankConfigs: RankConfigEntry[];
}
