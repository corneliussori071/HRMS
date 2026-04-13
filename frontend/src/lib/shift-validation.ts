/**
 * Shift validation engine for self-scheduling and manager assignment.
 * Replaces the auto-scheduling algorithm with rule-based validation.
 */

interface ShiftInfo {
  id: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

interface StaffInfo {
  id: string;
  rank_id: string | null;
  pay_type: "hourly" | "monthly";
  hours_per_week: number;
  days_per_week: number;
}

interface RankConfig {
  shift_id: string;
  rank_id: string;
  max_count: number;
}

interface ShiftConfig {
  shift_id: string;
  date: string | null;
  required_count: number;
}

interface ExistingAssignment {
  user_id: string;
  date: string;
  shift_id: string | null;
}

export interface ValidationContext {
  shifts: ShiftInfo[];
  staff: StaffInfo[];
  rankConfigs: RankConfig[];
  shiftConfigs: ShiftConfig[];
  assignments: ExistingAssignment[];
  rosterStartDate: string;
  rosterEndDate: string;
}

export type ValidationFailureType =
  | "already_assigned"
  | "rank_capacity"
  | "shift_full"
  | "hours_exceeded"
  | "days_exceeded"
  | "hours_underwork";

export interface CellValidation {
  available: boolean;
  reason: string | null;
  isOverridable: boolean;
  failureType: ValidationFailureType | null;
}

/**
 * Parse a time string "HH:MM" or "HH:MM:SS" to total minutes from midnight.
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.slice(0, 5).split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Compute the net working hours of a shift, accounting for overnight shifts
 * and break time. Returns hours as a decimal (e.g. 8.5).
 *
 * Formula:
 *   1. Convert start_time and end_time to minutes from midnight.
 *   2. If end <= start, the shift crosses midnight — add 1440 (24h) to end.
 *   3. Gross minutes = end - start.
 *   4. Net minutes = gross - break_minutes.
 *   5. Return net minutes / 60, floored at 0.
 */
export function computeShiftDurationHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const startMin = parseTimeToMinutes(startTime);
  let endMin = parseTimeToMinutes(endTime);
  if (endMin <= startMin) endMin += 1440;
  const grossMinutes = endMin - startMin;
  const netMinutes = grossMinutes - (breakMinutes || 0);
  return Math.max(0, netMinutes / 60);
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Return the 7-day rolling window ending on (and including) the given date.
 */
function getDaysInRollingWindow(date: string): string[] {
  const dates: string[] = [];
  const target = new Date(date + "T00:00:00");
  for (let i = 6; i >= 0; i--) {
    const d = new Date(target);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Compute total hours a staff member has worked in a 7-day rolling window,
 * EXCLUDING a specific date (so we can add the proposed shift separately).
 *
 * Returns { totalHours, shiftCount } for the window assignments.
 */
function computeWindowHours(
  ctx: ValidationContext,
  staffId: string,
  date: string
): { totalHours: number; shiftCount: number } {
  const windowDates = getDaysInRollingWindow(date);
  const windowAssignments = ctx.assignments.filter(
    (a) =>
      windowDates.includes(a.date) &&
      a.user_id === staffId &&
      a.shift_id !== null &&
      a.date !== date // exclude the date we're validating
  );

  let totalHours = 0;
  let shiftCount = 0;
  for (const wa of windowAssignments) {
    const waShift = ctx.shifts.find((s) => s.id === wa.shift_id);
    if (waShift) {
      totalHours += computeShiftDurationHours(
        waShift.start_time,
        waShift.end_time,
        waShift.break_minutes
      );
      shiftCount += 1;
    }
  }

  return { totalHours, shiftCount };
}

/**
 * Validate whether a specific staff member can be assigned to a specific
 * shift on a specific date, given the current state of assignments and
 * roster configuration.
 */
export function validateShiftAssignment(
  ctx: ValidationContext,
  staffId: string,
  date: string,
  shiftId: string
): CellValidation {
  const staff = ctx.staff.find((s) => s.id === staffId);
  if (!staff) {
    return { available: false, reason: "Staff member not found in roster", isOverridable: false, failureType: null };
  }

  const shift = ctx.shifts.find((s) => s.id === shiftId);
  if (!shift) {
    return { available: false, reason: "Shift not found", isOverridable: false, failureType: null };
  }

  // 1. Check if staff already has a DIFFERENT shift on this date
  const existingOnDate = ctx.assignments.find(
    (a) => a.user_id === staffId && a.date === date && a.shift_id !== null
  );
  if (existingOnDate && existingOnDate.shift_id !== shiftId) {
    return { available: false, reason: "Already assigned to a shift on this date", isOverridable: true, failureType: "already_assigned" };
  }

  // 2. Check rank capacity for this shift on this date
  if (staff.rank_id) {
    const rankConfig = ctx.rankConfigs.find(
      (rc) => rc.shift_id === shiftId && rc.rank_id === staff.rank_id
    );
    if (rankConfig) {
      const sameRankOnShift = ctx.assignments.filter(
        (a) => a.date === date && a.shift_id === shiftId && a.user_id !== staffId
      );
      const sameRankCount = sameRankOnShift.filter((a) => {
        const s = ctx.staff.find((st) => st.id === a.user_id);
        return s && s.rank_id === staff.rank_id;
      }).length;
      if (sameRankCount >= rankConfig.max_count) {
        return {
          available: false,
          reason: `Rank capacity reached (${rankConfig.max_count} max for this rank)`,
          isOverridable: true,
          failureType: "rank_capacity",
        };
      }
    }
  }

  // 3. Check total shift capacity for this date
  const shiftConfig = ctx.shiftConfigs.find(
    (sc) => sc.shift_id === shiftId && (sc.date === date || sc.date === null)
  );
  if (shiftConfig) {
    const dateSpecific = ctx.shiftConfigs.find(
      (sc) => sc.shift_id === shiftId && sc.date === date
    );
    const effectiveConfig = dateSpecific ?? shiftConfig;
    const currentCount = ctx.assignments.filter(
      (a) => a.date === date && a.shift_id === shiftId && a.user_id !== staffId
    ).length;
    if (currentCount >= effectiveConfig.required_count) {
      return {
        available: false,
        reason: `Shift is full (${effectiveConfig.required_count} staff required)`,
        isOverridable: true,
        failureType: "shift_full",
      };
    }
  }

  // 4. Check hours/days limit based on pay type (rolling 7-day window)
  if (staff.pay_type === "hourly") {
    const { totalHours: existingHours, shiftCount } = computeWindowHours(ctx, staffId, date);
    const proposedHours = computeShiftDurationHours(
      shift.start_time,
      shift.end_time,
      shift.break_minutes
    );
    const grandTotal = existingHours + proposedHours;

    if (grandTotal > staff.hours_per_week) {
      return {
        available: false,
        reason: `Would exceed weekly hours limit (${existingHours.toFixed(1)}h worked in ${shiftCount} shift${shiftCount !== 1 ? "s" : ""} + ${proposedHours.toFixed(1)}h proposed = ${grandTotal.toFixed(1)}h / ${staff.hours_per_week}h)`,
        isOverridable: true,
        failureType: "hours_exceeded",
      };
    }
  } else {
    // monthly pay: check days_per_week in rolling window
    const windowDates = getDaysInRollingWindow(date);
    const daysWorked = new Set(
      ctx.assignments
        .filter(
          (a) =>
            windowDates.includes(a.date) &&
            a.user_id === staffId &&
            a.shift_id !== null &&
            a.date !== date
        )
        .map((a) => a.date)
    );
    daysWorked.add(date); // include proposed day
    if (daysWorked.size > staff.days_per_week) {
      return {
        available: false,
        reason: `Would exceed weekly days limit (${daysWorked.size} / ${staff.days_per_week} days)`,
        isOverridable: true,
        failureType: "days_exceeded",
      };
    }
  }

  return { available: true, reason: null, isOverridable: false, failureType: null };
}

/**
 * Get the availability status for every shift on a given date for a staff member.
 * Returns a map of shiftId -> CellValidation.
 */
export function getShiftAvailability(
  ctx: ValidationContext,
  staffId: string,
  date: string
): Record<string, CellValidation> {
  const result: Record<string, CellValidation> = {};
  for (const shift of ctx.shifts) {
    result[shift.id] = validateShiftAssignment(ctx, staffId, date, shift.id);
  }
  return result;
}

/**
 * Validate a proposed shift swap between two staff members.
 */
export function validateShiftSwap(
  ctx: ValidationContext,
  requesterId: string,
  targetId: string,
  date: string,
  requesterShiftId: string | null,
  targetShiftId: string | null
): { valid: boolean; reason: string | null } {
  const requester = ctx.staff.find((s) => s.id === requesterId);
  const target = ctx.staff.find((s) => s.id === targetId);

  if (!requester || !target) {
    return { valid: false, reason: "Staff member not found" };
  }

  // Rank check: both must have the same rank
  if (requester.rank_id !== target.rank_id) {
    return { valid: false, reason: "Staff must have the same rank to swap shifts" };
  }

  // Simulate the swap: temporarily modify assignments
  const simulatedAssignments = ctx.assignments.map((a) => {
    if (a.user_id === requesterId && a.date === date) {
      return { ...a, shift_id: targetShiftId };
    }
    if (a.user_id === targetId && a.date === date) {
      return { ...a, shift_id: requesterShiftId };
    }
    return a;
  });

  const simCtx: ValidationContext = { ...ctx, assignments: simulatedAssignments };

  // Validate the swap for both parties (skip rank/capacity checks since it's a true swap)
  if (targetShiftId) {
    const requesterCheck = validateShiftAssignment(simCtx, requesterId, date, targetShiftId);
    if (!requesterCheck.available) {
      return { valid: false, reason: `Requester: ${requesterCheck.reason}` };
    }
  }

  if (requesterShiftId) {
    const targetCheck = validateShiftAssignment(simCtx, targetId, date, requesterShiftId);
    if (!targetCheck.available) {
      return { valid: false, reason: `Target: ${targetCheck.reason}` };
    }
  }

  return { valid: true, reason: null };
}

/**
 * Validate whether a staff member can take a day off on a given date without
 * making it impossible to meet their minimum required hours (or days) per week.
 *
 * The check works by inspecting the 7-day rolling window ending on `date`:
 *   - Days with a shift assignment (shift_id !== null) → committed hours.
 *   - Days with shift_id === null → explicitly off (0 hours, locked).
 *   - Days with no assignment entry → unscheduled (could still be filled).
 *
 * The proposed off for `date` should already be included in ctx.assignments
 * as { user_id, date, shift_id: null }.
 *
 * If even filling every remaining unscheduled day with the longest available
 * shift cannot reach the staff member's required weekly hours, the off is
 * blocked.
 */
export function validateDayOff(
  ctx: ValidationContext,
  staffId: string,
  date: string
): CellValidation {
  const staff = ctx.staff.find((s) => s.id === staffId);
  if (!staff) {
    return { available: true, reason: null, isOverridable: false, failureType: null };
  }

  const windowDates = getDaysInRollingWindow(date);

  // Find the maximum net hours any single shift can provide
  const maxShiftHours = ctx.shifts.reduce((max, s) => {
    const h = computeShiftDurationHours(s.start_time, s.end_time, s.break_minutes);
    return h > max ? h : max;
  }, 0);

  if (staff.pay_type === "hourly") {
    let committedHours = 0;
    let committedShifts = 0;
    let unscheduledDays = 0;

    for (const d of windowDates) {
      const assignment = ctx.assignments.find(
        (a) => a.user_id === staffId && a.date === d
      );
      if (assignment) {
        if (assignment.shift_id !== null) {
          const shift = ctx.shifts.find((s) => s.id === assignment.shift_id);
          if (shift) {
            committedHours += computeShiftDurationHours(
              shift.start_time,
              shift.end_time,
              shift.break_minutes
            );
            committedShifts++;
          }
        }
        // else: explicitly off — contributes 0h, not available for scheduling
      } else {
        unscheduledDays++;
      }
    }

    const maxPossible = committedHours + unscheduledDays * maxShiftHours;

    // The effective minimum accounts for discrete shifts that may not divide
    // evenly into hours_per_week. E.g. 7.5h shifts with 40h target → the
    // highest reachable total without exceeding max is 5 × 7.5 = 37.5h.
    // Comparing against 40h would deadlock: shifts blocked by overwork,
    // off blocked by underwork. Using 37.5h resolves it.
    const effectiveMinHours =
      maxShiftHours > 0
        ? Math.floor(staff.hours_per_week / maxShiftHours) * maxShiftHours
        : staff.hours_per_week;

    if (maxPossible < effectiveMinHours) {
      return {
        available: false,
        reason: `Would underwork weekly hours (${committedHours.toFixed(1)}h in ${committedShifts} shift${committedShifts !== 1 ? "s" : ""} + ${unscheduledDays} open day${unscheduledDays !== 1 ? "s" : ""} × ${maxShiftHours.toFixed(1)}h max = ${maxPossible.toFixed(1)}h / ${effectiveMinHours.toFixed(1)}h effective minimum)`,
        isOverridable: false,
        failureType: "hours_underwork",
      };
    }
  } else {
    // Monthly pay: check days_per_week
    let workedDays = 0;
    let unscheduledDays = 0;

    for (const d of windowDates) {
      const assignment = ctx.assignments.find(
        (a) => a.user_id === staffId && a.date === d
      );
      if (assignment) {
        if (assignment.shift_id !== null) {
          workedDays++;
        }
        // else: explicitly off
      } else {
        unscheduledDays++;
      }
    }

    const maxPossibleDays = workedDays + unscheduledDays;

    if (maxPossibleDays < staff.days_per_week) {
      return {
        available: false,
        reason: `Would underwork weekly days (${workedDays} day${workedDays !== 1 ? "s" : ""} committed + ${unscheduledDays} open = ${maxPossibleDays} possible / ${staff.days_per_week} required)`,
        isOverridable: false,
        failureType: "hours_underwork",
      };
    }
  }

  return { available: true, reason: null, isOverridable: false, failureType: null };
}

/**
 * Generate an empty grid (all nulls) for a roster date range and staff list.
 * This replaces the old auto-scheduling algorithm.
 */
export function generateEmptyGrid(
  startDate: string,
  endDate: string,
  staffIds: string[]
): Record<string, Record<string, string | null>> {
  const dates = getDateRange(startDate, endDate);
  const grid: Record<string, Record<string, string | null>> = {};
  for (const date of dates) {
    grid[date] = {};
    for (const staffId of staffIds) {
      grid[date][staffId] = null;
    }
  }
  return grid;
}
