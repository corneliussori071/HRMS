import {
  GenerationInput,
  GenerationResult,
  GenerationShift,
  GenerationStaffMember,
  UnderstaffedSlot,
} from "@/types/roster";

function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440;
  const workMinutes = endMin - startMin - breakMinutes;
  return Math.max(0, workMinutes / 60);
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

function chunkIntoWeeks(dates: string[]): string[][] {
  const weeks: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }
  return weeks;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface StaffState {
  hoursThisWeek: number;
  shiftsThisWeek: number;
  recentShiftIds: string[];
  shiftCounts: Record<string, number>;
  totalShifts: number;
}

function scoreStaffForShift(
  state: StaffState,
  shift: GenerationShift,
  shiftHours: number,
  maxHoursPerWeek: number,
  minHoursPerWeek: number,
  assignedToday: boolean,
  totalStaff: number,
  allOffToday: boolean,
  random: () => number
): number {
  if (assignedToday) return -10000;
  if (state.hoursThisWeek >= maxHoursPerWeek) return -5000;
  if (state.hoursThisWeek + shiftHours > maxHoursPerWeek) return -5000;

  let score = 0;

  if (state.hoursThisWeek < minHoursPerWeek) {
    score += 200;
  }

  const recentCount = state.recentShiftIds
    .slice(-3)
    .filter((id) => id === shift.id).length;
  score -= recentCount * 80;

  const avgShifts =
    totalStaff > 0
      ? Object.values(state.shiftCounts).reduce((a, b) => a + b, 0) /
        Math.max(Object.keys(state.shiftCounts).length, 1)
      : 0;
  const thisShiftCount = state.shiftCounts[shift.id] || 0;
  if (thisShiftCount > avgShifts) {
    score -= (thisShiftCount - avgShifts) * 30;
  } else {
    score += (avgShifts - thisShiftCount) * 20;
  }

  if (allOffToday) {
    score += 500;
  }

  score += random() * 15;

  return score;
}

export function generateRoster(input: GenerationInput): GenerationResult {
  const { shifts, staff, startDate, endDate, minStaffPerShift, maxStaffPerShift } =
    input;

  if (shifts.length === 0 || staff.length === 0) {
    return { assignments: {}, understaffed: [] };
  }

  const dates = getDateRange(startDate, endDate);
  const weeks = chunkIntoWeeks(dates);

  const shiftHoursMap: Record<string, number> = {};
  for (const shift of shifts) {
    shiftHoursMap[shift.id] = calculateShiftHours(
      shift.start_time,
      shift.end_time,
      shift.break_minutes
    );
  }

  const allShiftHours = shifts.map((s) => shiftHoursMap[s.id]);
  const minShiftHours = Math.min(...allShiftHours);
  const maxHoursPerWeek = Math.min(
    ...shifts.map((s) => Number(s.max_hours_per_week))
  );
  const minHoursPerWeek = Math.max(
    ...shifts.map((s) => Number(s.min_hours_per_week))
  );
  const maxWorkingDaysPerWeek =
    minShiftHours > 0
      ? Math.floor(maxHoursPerWeek / minShiftHours)
      : 7;

  const allAssignments: Record<string, Record<string, string | null>> = {};
  const understaffed: UnderstaffedSlot[] = [];
  const seed = dates.length * staff.length + shifts.length;
  const random = seededRandom(seed);

  const globalState: Record<string, StaffState> = {};
  for (const s of staff) {
    globalState[s.id] = {
      hoursThisWeek: 0,
      shiftsThisWeek: 0,
      recentShiftIds: [],
      shiftCounts: {},
      totalShifts: 0,
    };
  }

  for (const week of weeks) {
    for (const s of staff) {
      globalState[s.id].hoursThisWeek = 0;
      globalState[s.id].shiftsThisWeek = 0;
    }

    for (const date of week) {
      const dayAssigned = new Set<string>();
      const dayMap: Record<string, string | null> = {};

      for (const shift of shifts) {
        const shiftHours = shiftHoursMap[shift.id];

        const scored: { staffMember: GenerationStaffMember; score: number }[] =
          [];
        const allOff = dayAssigned.size === 0;

        for (const s of staff) {
          const state = globalState[s.id];
          const alreadyAssigned = dayAssigned.has(s.id);

          const sc = scoreStaffForShift(
            state,
            shift,
            shiftHours,
            maxHoursPerWeek,
            minHoursPerWeek,
            alreadyAssigned,
            staff.length,
            allOff,
            random
          );

          scored.push({ staffMember: s, score: sc });
        }

        scored.sort((a, b) => b.score - a.score);

        const eligible = scored.filter((s) => s.score > -5000);
        const toAssign = Math.min(maxStaffPerShift, eligible.length);
        const assigned = eligible.slice(0, toAssign);

        if (assigned.length < minStaffPerShift) {
          understaffed.push({
            date,
            shift_id: shift.id,
            shift_name: "",
            shift_key: shift.short_key,
            assigned_count: assigned.length,
            min_required: minStaffPerShift,
          });
        }

        for (const { staffMember } of assigned) {
          dayMap[staffMember.id] = shift.id;
          dayAssigned.add(staffMember.id);

          const state = globalState[staffMember.id];
          state.hoursThisWeek += shiftHours;
          state.shiftsThisWeek += 1;
          state.recentShiftIds.push(shift.id);
          state.shiftCounts[shift.id] =
            (state.shiftCounts[shift.id] || 0) + 1;
          state.totalShifts += 1;
        }
      }

      for (const s of staff) {
        if (!dayAssigned.has(s.id)) {
          dayMap[s.id] = null;
        }
      }

      allAssignments[date] = dayMap;
    }

    postProcessWeek(
      week,
      allAssignments,
      globalState,
      staff,
      shifts,
      shiftHoursMap,
      minHoursPerWeek,
      maxHoursPerWeek,
      maxWorkingDaysPerWeek,
      understaffed,
      minStaffPerShift
    );
  }

  ensureNeverAllOff(
    dates,
    allAssignments,
    staff,
    shifts,
    shiftHoursMap,
    globalState,
    maxHoursPerWeek,
    random
  );

  return { assignments: allAssignments, understaffed };
}

function postProcessWeek(
  week: string[],
  allAssignments: Record<string, Record<string, string | null>>,
  globalState: Record<string, StaffState>,
  staff: GenerationStaffMember[],
  shifts: GenerationShift[],
  shiftHoursMap: Record<string, number>,
  minHoursPerWeek: number,
  maxHoursPerWeek: number,
  maxWorkingDaysPerWeek: number,
  understaffed: UnderstaffedSlot[],
  minStaffPerShift: number
): void {
  for (const s of staff) {
    const state = globalState[s.id];
    if (state.hoursThisWeek >= minHoursPerWeek) continue;

    const offDays = week.filter(
      (d) => allAssignments[d] && allAssignments[d][s.id] === null
    );
    if (offDays.length === 0) continue;
    if (state.shiftsThisWeek >= maxWorkingDaysPerWeek) continue;

    for (const offDay of offDays) {
      if (state.hoursThisWeek >= minHoursPerWeek) break;
      if (state.shiftsThisWeek >= maxWorkingDaysPerWeek) break;

      let bestShift: GenerationShift | null = null;
      let bestUnderstaffIdx = -1;

      for (const shift of shifts) {
        const hrs = shiftHoursMap[shift.id];
        if (state.hoursThisWeek + hrs > maxHoursPerWeek) continue;

        const uIdx = understaffed.findIndex(
          (u) => u.date === offDay && u.shift_id === shift.id
        );
        if (uIdx >= 0) {
          bestShift = shift;
          bestUnderstaffIdx = uIdx;
          break;
        }
        if (!bestShift) {
          bestShift = shift;
        }
      }

      if (bestShift) {
        allAssignments[offDay][s.id] = bestShift.id;
        const hrs = shiftHoursMap[bestShift.id];
        state.hoursThisWeek += hrs;
        state.shiftsThisWeek += 1;
        state.recentShiftIds.push(bestShift.id);
        state.shiftCounts[bestShift.id] =
          (state.shiftCounts[bestShift.id] || 0) + 1;
        state.totalShifts += 1;

        if (bestUnderstaffIdx >= 0) {
          const slot = understaffed[bestUnderstaffIdx];
          slot.assigned_count += 1;
          if (slot.assigned_count >= minStaffPerShift) {
            understaffed.splice(bestUnderstaffIdx, 1);
          }
        }
      }
    }
  }
}

function ensureNeverAllOff(
  dates: string[],
  allAssignments: Record<string, Record<string, string | null>>,
  staff: GenerationStaffMember[],
  shifts: GenerationShift[],
  shiftHoursMap: Record<string, number>,
  _globalState: Record<string, StaffState>,
  maxHoursPerWeek: number,
  random: () => number
): void {
  const weeks = chunkIntoWeeks(dates);

  for (const week of weeks) {
    // Calculate actual hours per staff for this specific week
    const weeklyHours: Record<string, number> = {};
    for (const s of staff) {
      weeklyHours[s.id] = 0;
      for (const d of week) {
        const dayMap = allAssignments[d];
        if (!dayMap) continue;
        const shiftId = dayMap[s.id];
        if (shiftId) weeklyHours[s.id] += shiftHoursMap[shiftId] ?? 0;
      }
    }

    for (const date of week) {
      const dayMap = allAssignments[date];
      if (!dayMap) continue;

      const workingCount = staff.filter((s) => dayMap[s.id] !== null).length;
      if (workingCount > 0) continue;

      let bestCandidate: GenerationStaffMember | null = null;
      let bestShift: GenerationShift | null = null;
      let bestScore = -Infinity;

      for (const s of staff) {
        const sHours = weeklyHours[s.id];

        // Find the smallest shift this person could still take
        const fittingShifts = shifts.filter(
          (sh) => sHours + shiftHoursMap[sh.id] <= maxHoursPerWeek
        );
        if (fittingShifts.length === 0) continue;

        const offCount = week.filter(
          (d) => allAssignments[d] && allAssignments[d][s.id] === null
        ).length;
        const score = offCount + random() * 5;
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = s;
          // Pick the least-assigned fitting shift
          bestShift = [...fittingShifts].sort((a, b) => {
            const ca = _globalState[s.id].shiftCounts[a.id] || 0;
            const cb = _globalState[s.id].shiftCounts[b.id] || 0;
            return ca - cb;
          })[0];
        }
      }

      if (bestCandidate && bestShift) {
        const hrs = shiftHoursMap[bestShift.id];
        if (weeklyHours[bestCandidate.id] + hrs > maxHoursPerWeek) continue;

        dayMap[bestCandidate.id] = bestShift.id;
        weeklyHours[bestCandidate.id] += hrs;
        const state = _globalState[bestCandidate.id];
        state.hoursThisWeek = weeklyHours[bestCandidate.id];
        state.shiftsThisWeek += 1;
        state.recentShiftIds.push(bestShift.id);
        state.shiftCounts[bestShift.id] =
          (state.shiftCounts[bestShift.id] || 0) + 1;
        state.totalShifts += 1;
      }
    }
  }
}
