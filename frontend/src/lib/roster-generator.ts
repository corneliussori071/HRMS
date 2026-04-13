import {
  GenerationInput,
  GenerationResult,
} from "@/types/roster";

/**
 * Generate an empty roster grid framework.
 * Auto-scheduling has been replaced with self-scheduling.
 * This function creates a date x staff grid with all cells set to null (off),
 * ready for staff/manager to fill via the self-scheduling UI.
 */
export function generateRoster(input: GenerationInput): GenerationResult {
  const { staff, startDate, endDate } = input;

  if (staff.length === 0) {
    return { assignments: {}, understaffed: [], violations: [] };
  }

  const dates = getDateRange(startDate, endDate);
  const assignments: Record<string, Record<string, string | null>> = {};

  for (const date of dates) {
    assignments[date] = {};
    for (const s of staff) {
      assignments[date][s.id] = null;
    }
  }

  return { assignments, understaffed: [], violations: [] };
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
