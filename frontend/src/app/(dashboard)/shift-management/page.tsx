"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { Permission } from "@/types/permission";
import { Department } from "@/types/department";
import { Shift } from "@/types/shift";
import { Roster } from "@/types/roster";
import {
  ValidationContext,
  CellValidation,
  getShiftAvailability,
  generateEmptyGrid,
  computeShiftDurationHours,
  validateDayOff,
} from "@/lib/shift-validation";

type ShiftTab = "my-shifts" | "create-roster";

interface ShiftConfig {
  shift_id: string;
  date: string | null;
  required_count: number;
}

interface RankConfig {
  shift_id: string;
  rank_id: string;
  max_count: number;
}

interface StaffRow {
  id: string;
  full_name: string;
  rank_id: string | null;
  rank_name: string | null;
  pay_type: "hourly" | "monthly";
  hours_per_week: number;
  days_per_week: number;
  included: boolean;
}

interface MyShiftRow {
  date: string;
  shift_name: string;
  shift_key: string;
  shift_start: string;
  shift_end: string;
  roster_title: string;
  department_name: string;
}

interface ExistingRoster extends Roster {
  departments?: { id: string; name: string } | null;
}

interface SelfScheduleShift {
  id: string;
  name: string;
  short_key: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  min_hours_per_week: number;
  max_hours_per_week: number;
}

interface SelfScheduleRoster {
  roster_id: string;
  title: string;
  department_name: string;
  start_date: string;
  end_date: string;
  min_staff_per_shift: number;
  max_staff_per_shift: number;
  shifts: SelfScheduleShift[];
}

interface ShiftConfigRow {
  shiftId: string;
  requiredCount: number;
}

interface RankConfigRow {
  shiftId: string;
  rankId: string;
  maxCount: number;
}

interface RankOption {
  id: string;
  name: string;
}

export default function ShiftManagementPage() {
  const [activeTab, setActiveTab] = useState<ShiftTab>("my-shifts");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  // My Shifts state
  const [myShifts, setMyShifts] = useState<MyShiftRow[]>([]);
  const [myShiftsLoading, setMyShiftsLoading] = useState(false);
  const [selfScheduleRosters, setSelfScheduleRosters] = useState<SelfScheduleRoster[]>([]);
  const [selfScheduleModalRoster, setSelfScheduleModalRoster] = useState<SelfScheduleRoster | null>(null);
  const [selfScheduleSelections, setSelfScheduleSelections] = useState<Record<string, string>>({});
  const [selfScheduleAvailability, setSelfScheduleAvailability] = useState<Record<string, Record<string, CellValidation>>>({});
  const [selfScheduleOffAvailability, setSelfScheduleOffAvailability] = useState<Record<string, CellValidation>>({});
  const [selfScheduleContext, setSelfScheduleContext] = useState<ValidationContext | null>(null);
  const [selfScheduleLoading, setSelfScheduleLoading] = useState(false);
  const [selfScheduleSaving, setSelfScheduleSaving] = useState(false);
  const [selfScheduleError, setSelfScheduleError] = useState("");

  // Create Roster state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptShifts, setDeptShifts] = useState<Shift[]>([]);
  const [deptStaff, setDeptStaff] = useState<StaffRow[]>([]);
  const [deptRanks, setDeptRanks] = useState<RankOption[]>([]);
  const [checkedShifts, setCheckedShifts] = useState<Set<string>>(new Set());
  const [rosterTitle, setRosterTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [generatedGrid, setGeneratedGrid] = useState<Record<string, Record<string, string | null>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingDeptData, setLoadingDeptData] = useState(false);
  const [allowSelfScheduling, setAllowSelfScheduling] = useState(false);

  // Shift config: per-shift required staff count
  const [shiftConfigs, setShiftConfigs] = useState<ShiftConfigRow[]>([]);
  // Rank config: per-shift per-rank max count
  const [rankConfigs, setRankConfigs] = useState<RankConfigRow[]>([]);

  // Edit cell modal with validation
  const [editCell, setEditCell] = useState<{ userId: string; date: string; userName: string } | null>(null);
  const [editShiftId, setEditShiftId] = useState<string>("off");
  const [cellAvailability, setCellAvailability] = useState<Record<string, CellValidation>>({});
  const [editOffValidation, setEditOffValidation] = useState<CellValidation | null>(null);
  const [overrideConfirm, setOverrideConfirm] = useState<{ shiftId: string; reason: string; isHoursExceeded: boolean } | null>(null);

  // Existing rosters state
  const [existingRosters, setExistingRosters] = useState<ExistingRoster[]>([]);
  const [viewRoster, setViewRoster] = useState<ExistingRoster | null>(null);
  const [viewGrid, setViewGrid] = useState<Record<string, Record<string, string | null>> | null>(null);
  const [viewShifts, setViewShifts] = useState<Shift[]>([]);
  const [viewStaff, setViewStaff] = useState<StaffRow[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // View roster editing state (for managers editing published rosters)
  const [viewEditCell, setViewEditCell] = useState<{ userId: string; date: string; userName: string } | null>(null);
  const [viewEditShiftId, setViewEditShiftId] = useState<string>("off");
  const [viewCellAvailability, setViewCellAvailability] = useState<Record<string, CellValidation>>({});
  const [viewEditOffValidation, setViewEditOffValidation] = useState<CellValidation | null>(null);
  const [viewOverrideConfirm, setViewOverrideConfirm] = useState<{ shiftId: string; reason: string; isHoursExceeded: boolean } | null>(null);
  const [viewSaving, setViewSaving] = useState(false);
  const [viewSaveError, setViewSaveError] = useState("");
  const [viewShiftConfigs, setViewShiftConfigs] = useState<ShiftConfig[]>([]);
  const [viewRankConfigs, setViewRankConfigs] = useState<RankConfig[]>([]);



  const fetchInitialData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: perms } = await supabase
      .from("user_permissions")
      .select("permission")
      .eq("user_id", user.id);

    const userPerms = (perms ?? []).map((p) => p.permission as Permission);
    setPermissions(userPerms);

    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, description, created_at")
      .order("name", { ascending: true });

    if (depts) setDepartments(depts as Department[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const canCreateRoster = permissions.includes("create_roster");

  // ─── My Shifts ────────────────────────────────────────────

  const fetchMyShifts = useCallback(async () => {
    setMyShiftsLoading(true);
    const res = await fetch("/api/rosters/my-shifts");
    const json = await res.json();
    const data = json.data;
    if (data) {
      setMyShifts(data.assignments ?? data);
      setSelfScheduleRosters(data.self_schedule_rosters ?? []);
    }
    setMyShiftsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "my-shifts" && userId) {
      fetchMyShifts();
    }
  }, [activeTab, userId, fetchMyShifts]);

  function openSelfSchedulePicker(roster: SelfScheduleRoster) {
    setSelfScheduleModalRoster(roster);
    setSelfScheduleSelections({});
    setSelfScheduleAvailability({});
    setSelfScheduleContext(null);
    setSelfScheduleError("");
    loadSelfScheduleContext(roster);
  }

  async function loadSelfScheduleContext(roster: SelfScheduleRoster) {
    setSelfScheduleLoading(true);
    try {
      const res = await fetch(`/api/rosters/${roster.roster_id}`);
      const json = await res.json();
      const data = json.data;
      if (!data) return;

      interface RosterShiftRow {
        shift_id: string;
        shifts: Shift | null;
      }
      interface RosterStaffRow {
        user_id: string;
        is_included: boolean;
        profiles: {
          id: string;
          full_name: string;
          rank_id: string | null;
          pay_type: "hourly" | "monthly";
          hours_per_week: number;
          days_per_week: number;
          ranks: { name: string } | null;
        } | null;
      }
      interface AssignmentRow {
        user_id: string;
        date: string;
        shift_id: string | null;
      }

      const shiftRows = data.roster_shifts as RosterShiftRow[];
      const staffRows = data.roster_staff as RosterStaffRow[];
      const assignmentRows = data.assignments as AssignmentRow[];

      const shifts = shiftRows
        .filter((r) => r.shifts)
        .map((r) => r.shifts!);

      const staff = staffRows.map((r) => ({
        id: r.user_id,
        rank_id: r.profiles?.rank_id ?? null,
        pay_type: (r.profiles?.pay_type ?? "monthly") as "hourly" | "monthly",
        hours_per_week: r.profiles?.hours_per_week ?? 40,
        days_per_week: r.profiles?.days_per_week ?? 5,
      }));

      const assignments = assignmentRows.map((a) => ({
        user_id: a.user_id,
        date: a.date,
        shift_id: a.shift_id,
      }));

      const shiftConfigsData = (data.shift_configs as { shift_id: string; date: string | null; required_count: number }[]) ?? [];
      const rankConfigsData = (data.rank_configs as { shift_id: string; rank_id: string; max_count: number }[]) ?? [];

      const ctx: ValidationContext = {
        shifts: shifts.map((s) => ({
          id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          break_minutes: s.break_minutes,
        })),
        staff,
        rankConfigs: rankConfigsData,
        shiftConfigs: shiftConfigsData,
        assignments,
        rosterStartDate: roster.start_date,
        rosterEndDate: roster.end_date,
      };

      setSelfScheduleContext(ctx);

      // Pre-fill selections with user's existing assignments
      const existing: Record<string, string> = {};
      for (const a of assignmentRows) {
        if (a.user_id === userId && a.shift_id) {
          existing[a.date] = a.shift_id;
        }
      }
      setSelfScheduleSelections(existing);

      // Compute initial availability for each date
      computeSelfScheduleAvailability(ctx, existing);
    } finally {
      setSelfScheduleLoading(false);
    }
  }

  function computeSelfScheduleAvailability(
    ctx: ValidationContext,
    selections: Record<string, string>
  ) {
    // Build user assignments from selections.
    // "off" entries are included as shift_id: null so the underwork check
    // can distinguish "explicitly off" from "unscheduled".
    const baseAssignments = ctx.assignments.filter((a) => a.user_id !== userId);
    const userAssignments: { user_id: string; date: string; shift_id: string | null }[] =
      Object.entries(selections).map(([date, val]) => ({
        user_id: userId,
        date,
        shift_id: val === "off" ? null : val,
      }));
    const mergedCtx: ValidationContext = {
      ...ctx,
      assignments: [...baseAssignments, ...userAssignments],
    };

    const dates = getDateRange(ctx.rosterStartDate, ctx.rosterEndDate);
    const availability: Record<string, Record<string, CellValidation>> = {};
    const offAvail: Record<string, CellValidation> = {};

    for (const date of dates) {
      // Shift availability: remove user's entry for this date, validate each shift
      const ctxForDate: ValidationContext = {
        ...mergedCtx,
        assignments: mergedCtx.assignments.filter(
          (a) => !(a.user_id === userId && a.date === date)
        ),
      };
      availability[date] = getShiftAvailability(ctxForDate, userId, date);

      // Off availability: simulate user picking off on this date
      const ctxForOff: ValidationContext = {
        ...mergedCtx,
        assignments: [
          ...mergedCtx.assignments.filter(
            (a) => !(a.user_id === userId && a.date === date)
          ),
          { user_id: userId, date, shift_id: null },
        ],
      };
      offAvail[date] = validateDayOff(ctxForOff, userId, date);
    }

    setSelfScheduleAvailability(availability);
    setSelfScheduleOffAvailability(offAvail);
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

  function handleSelfScheduleDateShift(date: string, shiftId: string) {
    if (!selfScheduleContext) return;
    const updated = { ...selfScheduleSelections };
    if (updated[date] === shiftId) {
      // Toggle off: clicking the same selection removes it
      delete updated[date];
    } else {
      updated[date] = shiftId;
    }
    setSelfScheduleSelections(updated);
    computeSelfScheduleAvailability(selfScheduleContext, updated);
  }

  async function handleSelfScheduleSubmit() {
    if (!selfScheduleModalRoster) return;
    const entries = Object.entries(selfScheduleSelections).filter(([, sid]) => sid && sid !== "off");
    if (entries.length === 0) return;

    setSelfScheduleSaving(true);
    setSelfScheduleError("");

    try {
      for (const [date, shiftId] of entries) {
        const res = await fetch(`/api/rosters/${selfScheduleModalRoster.roster_id}/assignments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            date,
            shift_id: shiftId,
            is_self_scheduled: true,
          }),
        });
        if (!res.ok) {
          const ct = res.headers.get("content-type") ?? "";
          const msg = ct.includes("application/json")
            ? (await res.json()).error || "Failed to save assignment"
            : `Server error (${res.status})`;
          setSelfScheduleError(msg);
          return;
        }
      }
      setSelfScheduleModalRoster(null);
      fetchMyShifts();
    } catch {
      setSelfScheduleError("An unexpected error occurred.");
    } finally {
      setSelfScheduleSaving(false);
    }
  }

  // ─── Department data fetch ────────────────────────────────

  async function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId);
    setCheckedShifts(new Set());
    setDeptShifts([]);
    setDeptStaff([]);
    setDeptRanks([]);
    setShiftConfigs([]);
    setRankConfigs([]);
    setGeneratedGrid(null);
    if (!deptId) return;

    setLoadingDeptData(true);
    const supabase = createClient();

    const [{ data: shifts }, { data: profiles }, { data: ranks }] = await Promise.all([
      supabase
        .from("shifts")
        .select("id, department_id, name, short_key, start_time, end_time, break_minutes, min_hours_per_week, max_hours_per_week, is_active, created_at, updated_at")
        .eq("department_id", deptId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, rank_id, pay_type, hours_per_week, days_per_week, ranks(name)")
        .eq("department_id", deptId)
        .eq("status", "active"),
      supabase
        .from("ranks")
        .select("id, name")
        .order("name"),
    ]);

    if (shifts) setDeptShifts(shifts as Shift[]);

    if (profiles) {
      interface ProfileWithRank {
        id: string;
        full_name: string;
        rank_id: string | null;
        pay_type: "hourly" | "monthly";
        hours_per_week: number;
        days_per_week: number;
        ranks: { name: string } | null;
      }
      const staff: StaffRow[] = (profiles as unknown as ProfileWithRank[]).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        rank_id: p.rank_id,
        rank_name: p.ranks?.name ?? null,
        pay_type: p.pay_type ?? "monthly",
        hours_per_week: p.hours_per_week ?? 40,
        days_per_week: p.days_per_week ?? 5,
        included: true,
      }));
      setDeptStaff(staff);
    }

    if (ranks) {
      setDeptRanks(ranks as RankOption[]);
    }

    setLoadingDeptData(false);
  }

  function toggleShift(shiftId: string) {
    const wasChecked = checkedShifts.has(shiftId);

    setCheckedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });

    if (wasChecked) {
      setShiftConfigs((sc) => sc.filter((c) => c.shiftId !== shiftId));
      setRankConfigs((rc) => rc.filter((c) => c.shiftId !== shiftId));
    } else {
      setShiftConfigs((sc) => {
        if (sc.some((c) => c.shiftId === shiftId)) return sc;
        return [...sc, { shiftId, requiredCount: 1 }];
      });
    }
    setGeneratedGrid(null);
  }

  function toggleStaff(staffId: string) {
    setDeptStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, included: !s.included } : s
      )
    );
    setGeneratedGrid(null);
  }

  function updateShiftConfig(shiftId: string, requiredCount: number) {
    setShiftConfigs((prev) =>
      prev.map((c) => (c.shiftId === shiftId ? { ...c, requiredCount } : c))
    );
  }

  function addRankConfig(shiftId: string) {
    if (deptRanks.length === 0) return;
    setRankConfigs((prev) => [
      ...prev,
      { shiftId, rankId: deptRanks[0].id, maxCount: 1 },
    ]);
  }

  function updateRankConfig(index: number, field: "rankId" | "maxCount", value: string | number) {
    setRankConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function removeRankConfig(index: number) {
    setRankConfigs((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Build Validation Context ────────────────────────────

  function buildValidationContext(): ValidationContext | null {
    if (!generatedGrid) return null;

    const selectedShifts = deptShifts.filter((s) => checkedShifts.has(s.id));
    const includedStaff = deptStaff.filter((s) => s.included);

    const assignments: { user_id: string; date: string; shift_id: string | null }[] = [];
    for (const [date, dayMap] of Object.entries(generatedGrid)) {
      for (const [uid, shiftId] of Object.entries(dayMap)) {
        assignments.push({ user_id: uid, date, shift_id: shiftId });
      }
    }

    return {
      shifts: selectedShifts.map((s) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes,
      })),
      staff: includedStaff.map((s) => ({
        id: s.id,
        rank_id: s.rank_id,
        pay_type: s.pay_type,
        hours_per_week: s.hours_per_week,
        days_per_week: s.days_per_week,
      })),
      rankConfigs: rankConfigs.map((rc) => ({
        shift_id: rc.shiftId,
        rank_id: rc.rankId,
        max_count: rc.maxCount,
      })),
      shiftConfigs: shiftConfigs.map((sc) => ({
        shift_id: sc.shiftId,
        date: null,
        required_count: sc.requiredCount,
      })),
      assignments,
      rosterStartDate: startDate,
      rosterEndDate: endDate,
    };
  }

  // ─── Generate Empty Grid ──────────────────────────────────

  function handleGenerateGrid() {
    if (!startDate || !endDate || checkedShifts.size === 0) return;
    setSaveError("");

    const includedIds = deptStaff.filter((s) => s.included).map((s) => s.id);
    if (includedIds.length === 0) return;

    const grid = generateEmptyGrid(startDate, endDate, includedIds);
    setGeneratedGrid(grid);
  }

  // ─── Edit Cell (with validation) ─────────────────────────

  function openEditCell(uid: string, date: string, userName: string) {
    const ctx = buildValidationContext();
    if (ctx) {
      const availability = getShiftAvailability(ctx, uid, date);
      setCellAvailability(availability);

      // Compute off (underwork) validation: simulate assigning off on this date
      const ctxForOff: ValidationContext = {
        ...ctx,
        assignments: [
          ...ctx.assignments.filter((a) => !(a.user_id === uid && a.date === date)),
          { user_id: uid, date, shift_id: null },
        ],
      };
      setEditOffValidation(validateDayOff(ctxForOff, uid, date));
    } else {
      setEditOffValidation(null);
    }
    const currentShift = generatedGrid?.[date]?.[uid];
    setEditCell({ userId: uid, date, userName });
    setEditShiftId(currentShift ?? "off");
    setOverrideConfirm(null);
  }

  function handleEditCellSave() {
    if (!editCell || !generatedGrid) return;

    const newShiftId = editShiftId === "off" ? null : editShiftId;

    // Check validation before saving
    if (newShiftId) {
      const validation = cellAvailability[newShiftId];
      if (validation && !validation.available) {
        if (validation.isOverridable) {
          const isHoursExceeded = validation.failureType === "hours_exceeded" || validation.failureType === "days_exceeded";
          setOverrideConfirm({ shiftId: newShiftId, reason: validation.reason ?? "Validation failed", isHoursExceeded });
          return;
        }
        return; // Not overridable
      }
    } else {
      // Off selected — check underwork validation (manager can override)
      if (editOffValidation && !editOffValidation.available) {
        setOverrideConfirm({ shiftId: "off", reason: editOffValidation.reason ?? "Would cause underwork", isHoursExceeded: false });
        return;
      }
    }

    applyEditCell(newShiftId);
  }

  function handleOverrideConfirm() {
    if (!overrideConfirm) return;
    applyEditCell(overrideConfirm.shiftId === "off" ? null : overrideConfirm.shiftId);
    setOverrideConfirm(null);
  }

  async function handleOvertimeAndAssign() {
    if (!overrideConfirm || !editCell) return;

    const shift = deptShifts.find((s) => s.id === overrideConfirm.shiftId);
    if (!shift) return;

    const shiftHours = Math.round(
      computeShiftDurationHours(shift.start_time, shift.end_time, shift.break_minutes) * 10
    ) / 10;

    const supabase = createClient();
    await supabase.from("overtime").insert({
      user_id: editCell.userId,
      date: editCell.date,
      hours: shiftHours,
      reason: `Overtime: scheduled beyond limit - ${overrideConfirm.reason}`,
    });

    applyEditCell(overrideConfirm.shiftId);
  }

  function applyEditCell(shiftId: string | null) {
    if (!editCell || !generatedGrid) return;
    const updated = { ...generatedGrid };
    const dayMap = { ...updated[editCell.date] };
    dayMap[editCell.userId] = shiftId;
    updated[editCell.date] = dayMap;
    setGeneratedGrid(updated);
    setEditCell(null);
    setOverrideConfirm(null);
  }

  // ─── Save Roster ──────────────────────────────────────────

  async function handleSave(status: "draft" | "published") {
    if (!generatedGrid || !rosterTitle || !selectedDeptId) return;
    setSaving(true);
    setSaveError("");

    try {
      const includedIds = deptStaff.filter((s) => s.included).map((s) => s.id);

      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rosterTitle,
          department_id: selectedDeptId,
          start_date: startDate,
          end_date: endDate,
          allow_self_scheduling: allowSelfScheduling,
          completion_date: completionDate || null,
          shift_ids: Array.from(checkedShifts),
          staff_ids: includedIds,
          assignments: generatedGrid,
          shift_configs: shiftConfigs.map((sc) => ({
            shift_id: sc.shiftId,
            date: null,
            required_count: sc.requiredCount,
          })),
          rank_configs: rankConfigs.map((rc) => ({
            shift_id: rc.shiftId,
            rank_id: rc.rankId,
            max_count: rc.maxCount,
          })),
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = await res.json();
          setSaveError(body.error || "Failed to save roster");
        } else {
          setSaveError(`Server error (${res.status}). Please try again.`);
        }
        return;
      }

      const json = await res.json();
      const rosterId = json.data?.id;

      if (status === "published" && rosterId) {
        const pubRes = await fetch(`/api/rosters/${rosterId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });

        if (!pubRes.ok) {
          const ct = pubRes.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) {
            const pubBody = await pubRes.json();
            setSaveError(pubBody.error || "Roster created but failed to publish");
          } else {
            setSaveError(`Roster created but publish failed (${pubRes.status}).`);
          }
          return;
        }
      }

      resetForm();
      fetchExistingRosters();
    } catch {
      setSaveError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setRosterTitle("");
    setSelectedDeptId("");
    setDeptShifts([]);
    setDeptStaff([]);
    setDeptRanks([]);
    setCheckedShifts(new Set());
    setStartDate("");
    setEndDate("");
    setCompletionDate("");
    setShiftConfigs([]);
    setRankConfigs([]);
    setGeneratedGrid(null);
    setSaveError("");
    setAllowSelfScheduling(false);
  }

  // ─── Existing Rosters ────────────────────────────────────

  const fetchExistingRosters = useCallback(async () => {
    const res = await fetch("/api/rosters");
    const json = await res.json();
    if (json.data) setExistingRosters(json.data);
  }, []);

  useEffect(() => {
    if (activeTab === "create-roster" && canCreateRoster) {
      fetchExistingRosters();
    }
  }, [activeTab, canCreateRoster, fetchExistingRosters]);

  async function handleViewRoster(roster: ExistingRoster) {
    setViewRoster(roster);
    setViewLoading(true);
    setViewSaveError("");
    setViewEditCell(null);
    setViewOverrideConfirm(null);

    const res = await fetch(`/api/rosters/${roster.id}`);
    const json = await res.json();
    const data = json.data;

    if (data) {
      interface RosterShiftRow {
        shift_id: string;
        shifts: Shift | null;
      }
      interface RosterStaffRow {
        user_id: string;
        is_included: boolean;
        profiles: {
          id: string;
          full_name: string;
          rank_id: string | null;
          pay_type: "hourly" | "monthly";
          hours_per_week: number;
          days_per_week: number;
          ranks: { name: string } | null;
        } | null;
      }
      interface AssignmentRow {
        user_id: string;
        date: string;
        shift_id: string | null;
      }

      const shiftRows = data.roster_shifts as RosterShiftRow[];
      const staffRows = data.roster_staff as RosterStaffRow[];
      const assignmentRows = data.assignments as AssignmentRow[];

      const loadedShifts = shiftRows
        .filter((r: RosterShiftRow) => r.shifts)
        .map((r: RosterShiftRow) => r.shifts as Shift);
      setViewShifts(loadedShifts);

      setViewStaff(
        staffRows.map((r: RosterStaffRow) => ({
          id: r.user_id,
          full_name: r.profiles?.full_name ?? "",
          rank_id: r.profiles?.rank_id ?? null,
          rank_name: r.profiles?.ranks?.name ?? null,
          pay_type: r.profiles?.pay_type ?? "monthly",
          hours_per_week: r.profiles?.hours_per_week ?? 40,
          days_per_week: r.profiles?.days_per_week ?? 5,
          included: r.is_included,
        }))
      );

      const grid: Record<string, Record<string, string | null>> = {};
      for (const a of assignmentRows) {
        if (!grid[a.date]) grid[a.date] = {};
        grid[a.date][a.user_id] = a.shift_id;
      }
      setViewGrid(grid);

      // Store configs for validation context
      setViewShiftConfigs(
        (data.shift_configs as { shift_id: string; date: string | null; required_count: number }[]) ?? []
      );
      setViewRankConfigs(
        (data.rank_configs as { shift_id: string; rank_id: string; max_count: number }[]) ?? []
      );
    }
    setViewLoading(false);
  }

  async function handlePublishRoster(roster: ExistingRoster) {
    await fetch(`/api/rosters/${roster.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    fetchExistingRosters();
  }

  async function handleDeleteRoster(id: string) {
    await fetch(`/api/rosters/${id}`, { method: "DELETE" });
    fetchExistingRosters();
    if (viewRoster?.id === id) {
      setViewRoster(null);
      setViewGrid(null);
    }
  }

  // ─── View Roster Editing (for managers) ───────────────────

  function buildViewValidationContext(): ValidationContext | null {
    if (!viewGrid || !viewRoster) return null;

    const assignments: { user_id: string; date: string; shift_id: string | null }[] = [];
    for (const [date, dayMap] of Object.entries(viewGrid)) {
      for (const [uid, shiftId] of Object.entries(dayMap)) {
        assignments.push({ user_id: uid, date, shift_id: shiftId });
      }
    }

    return {
      shifts: viewShifts.map((s) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes,
      })),
      staff: viewStaff.map((s) => ({
        id: s.id,
        rank_id: s.rank_id,
        pay_type: s.pay_type,
        hours_per_week: s.hours_per_week,
        days_per_week: s.days_per_week,
      })),
      rankConfigs: viewRankConfigs,
      shiftConfigs: viewShiftConfigs,
      assignments,
      rosterStartDate: viewRoster.start_date,
      rosterEndDate: viewRoster.end_date,
    };
  }

  function openViewEditCell(uid: string, date: string, userName: string) {
    const ctx = buildViewValidationContext();
    if (ctx) {
      const availability = getShiftAvailability(ctx, uid, date);
      setViewCellAvailability(availability);

      // Compute off (underwork) validation: simulate assigning off on this date
      const ctxForOff: ValidationContext = {
        ...ctx,
        assignments: [
          ...ctx.assignments.filter((a) => !(a.user_id === uid && a.date === date)),
          { user_id: uid, date, shift_id: null },
        ],
      };
      setViewEditOffValidation(validateDayOff(ctxForOff, uid, date));
    } else {
      setViewEditOffValidation(null);
    }
    const currentShift = viewGrid?.[date]?.[uid];
    setViewEditCell({ userId: uid, date, userName });
    setViewEditShiftId(currentShift ?? "off");
    setViewOverrideConfirm(null);
    setViewSaveError("");
  }

  function handleViewEditCellSave() {
    if (!viewEditCell || !viewGrid) return;

    const newShiftId = viewEditShiftId === "off" ? null : viewEditShiftId;

    if (newShiftId) {
      const validation = viewCellAvailability[newShiftId];
      if (validation && !validation.available) {
        if (validation.isOverridable) {
          const isHoursExceeded = validation.failureType === "hours_exceeded" || validation.failureType === "days_exceeded";
          setViewOverrideConfirm({ shiftId: newShiftId, reason: validation.reason ?? "Validation failed", isHoursExceeded });
          return;
        }
        return;
      }
    } else {
      // Off selected — check underwork validation (manager can override)
      if (viewEditOffValidation && !viewEditOffValidation.available) {
        setViewOverrideConfirm({ shiftId: "off", reason: viewEditOffValidation.reason ?? "Would cause underwork", isHoursExceeded: false });
        return;
      }
    }

    applyViewEditCell(newShiftId, false);
  }

  function handleViewOverrideConfirm() {
    if (!viewOverrideConfirm) return;
    applyViewEditCell(viewOverrideConfirm.shiftId === "off" ? null : viewOverrideConfirm.shiftId, true);
    setViewOverrideConfirm(null);
  }

  async function handleViewOvertimeAndAssign() {
    if (!viewOverrideConfirm || !viewEditCell) return;

    const shift = viewShifts.find((s) => s.id === viewOverrideConfirm.shiftId);
    if (!shift) return;

    const shiftHours = Math.round(
      computeShiftDurationHours(shift.start_time, shift.end_time, shift.break_minutes) * 10
    ) / 10;

    const supabase = createClient();
    await supabase.from("overtime").insert({
      user_id: viewEditCell.userId,
      date: viewEditCell.date,
      hours: shiftHours,
      reason: `Overtime: scheduled beyond limit - ${viewOverrideConfirm.reason}`,
    });

    applyViewEditCell(viewOverrideConfirm.shiftId, true);
  }

  async function applyViewEditCell(shiftId: string | null, isOverride: boolean) {
    if (!viewEditCell || !viewGrid || !viewRoster) return;
    setViewSaving(true);
    setViewSaveError("");

    try {
      const res = await fetch(`/api/rosters/${viewRoster.id}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              user_id: viewEditCell.userId,
              date: viewEditCell.date,
              shift_id: shiftId,
              is_manual_override: isOverride,
            },
          ],
        }),
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const body = await res.json();
          setViewSaveError(body.error || "Failed to update assignment");
        } else {
          setViewSaveError(`Server error (${res.status}).`);
        }
        return;
      }

      // Update local grid
      const updated = { ...viewGrid };
      const dayMap = { ...(updated[viewEditCell.date] ?? {}) };
      dayMap[viewEditCell.userId] = shiftId;
      updated[viewEditCell.date] = dayMap;
      setViewGrid(updated);
      setViewEditCell(null);
      setViewOverrideConfirm(null);
    } catch {
      setViewSaveError("An unexpected error occurred.");
    } finally {
      setViewSaving(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  function getShiftKey(shiftId: string | null): string {
    if (!shiftId) return "";
    const shift = deptShifts.find((s) => s.id === shiftId);
    return shift?.short_key || "?";
  }

  function getViewShiftKey(shiftId: string | null): string {
    if (!shiftId) return "";
    const shift = viewShifts.find((s) => s.id === shiftId);
    return shift?.short_key || "?";
  }

  function getDates(grid: Record<string, Record<string, string | null>>): string[] {
    return Object.keys(grid).sort();
  }

  function formatDateHeader(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[d.getDay()];
    return `${day} ${d.getDate()}/${d.getMonth() + 1}`;
  }

  // ─── Tab definitions ──────────────────────────────────────

  const tabs: { key: ShiftTab; label: string; visible: boolean }[] = [
    { key: "my-shifts", label: "My Shifts", visible: true },
    { key: "create-roster", label: "Create Roster", visible: canCreateRoster },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  if (loading) {
    return (
      <MainContent title="Shift Management" description="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent
      title="Shift Management"
      description="View your shifts, create rosters, and manage overtime."
    >
      {/* Tabs */}
      <div className="flex border-b border-border">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ MY SHIFTS TAB ═══ */}
      {activeTab === "my-shifts" && (
        <div className="mt-6">
          {myShiftsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : myShifts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted">Date</th>
                    <th className="px-4 py-3 font-medium text-muted">Shift</th>
                    <th className="px-4 py-3 font-medium text-muted">Time</th>
                    <th className="px-4 py-3 font-medium text-muted">Roster</th>
                    <th className="px-4 py-3 font-medium text-muted">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {myShifts.map((s, i) => (
                    <tr
                      key={`${s.date}-${i}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 text-foreground">{s.date}</td>
                      <td className="px-4 py-3 text-foreground">
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-medium">
                          {s.shift_key}
                        </span>
                        <span className="ml-2">{s.shift_name}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {s.shift_start.slice(0, 5)} - {s.shift_end.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{s.roster_title}</td>
                      <td className="px-4 py-3 text-foreground">{s.department_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
              <p className="text-sm text-muted">No shift assignments found.</p>
              <p className="mt-1 text-xs text-muted">
                Shifts will appear here when a published roster includes you.
              </p>
            </div>
          )}

          {/* Self-Scheduling Rosters */}
          {!myShiftsLoading && selfScheduleRosters.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Self-Scheduling Available</h3>
              <p className="text-xs text-muted">
                These rosters allow you to pick your own shifts. Select a roster to choose a date and shift.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted">Roster</th>
                      <th className="px-4 py-3 font-medium text-muted">Department</th>
                      <th className="px-4 py-3 font-medium text-muted">Period</th>
                      <th className="px-4 py-3 font-medium text-muted">Shifts</th>
                      <th className="px-4 py-3 font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selfScheduleRosters.map((r) => (
                      <tr key={r.roster_id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-foreground">{r.department_name}</td>
                        <td className="px-4 py-3 text-foreground">{r.start_date} to {r.end_date}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.shifts.map((s) => (
                              <span key={s.id} className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-medium">
                                {s.short_key}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="secondary" onClick={() => openSelfSchedulePicker(r)}>
                            Pick Shift
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATE ROSTER TAB ═══ */}
      {activeTab === "create-roster" && canCreateRoster && (
        <div className="mt-6 space-y-6">
          {/* Roster Form */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">New Roster</h3>

            <FormInput
              label="Roster Title"
              value={rosterTitle}
              onChange={(e) => setRosterTitle(e.target.value)}
              placeholder="e.g. Week 14 Schedule"
              required
            />

            <FormSelect
              label="Department"
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Select a department"
            />

            {selectedDeptId && !loadingDeptData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setGeneratedGrid(null); }}
                  />
                  <FormInput
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setGeneratedGrid(null); }}
                  />
                </div>

                {/* Self-scheduling toggle */}
                <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-surface/50">
                  <input
                    type="checkbox"
                    checked={allowSelfScheduling}
                    onChange={(e) => { setAllowSelfScheduling(e.target.checked); if (!e.target.checked) setCompletionDate(""); }}
                    className="mt-0.5 h-4 w-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">Allow self-scheduling</span>
                    <p className="mt-0.5 text-xs text-muted">
                      When enabled, staff can pick their own shifts from the published roster. Validation rules still apply.
                    </p>
                  </div>
                </label>

                {allowSelfScheduling && (
                  <>
                    <FormInput
                      label="Self-Scheduling Deadline (optional)"
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                    />
                    <p className="text-xs text-muted -mt-3">
                      Staff must complete their shift selections by this date.
                    </p>
                  </>
                )}

                {/* Shift selection with staffing configuration */}
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Shifts &amp; Staffing Requirements</p>
                  {deptShifts.length > 0 ? (
                    <div className="space-y-2">
                      {deptShifts.map((s) => {
                        const isChecked = checkedShifts.has(s.id);
                        const config = shiftConfigs.find((c) => c.shiftId === s.id);
                        const shiftRankConfigs = rankConfigs
                          .map((rc, idx) => ({ ...rc, _index: idx }))
                          .filter((rc) => rc.shiftId === s.id);

                        return (
                          <div key={s.id} className="rounded-md border border-border p-2.5">
                            <label className="flex items-center gap-3 cursor-pointer hover:bg-surface">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleShift(s.id)}
                                className="h-4 w-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-foreground">{s.name}</span>
                                <span className="ml-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-medium">{s.short_key}</span>
                                <span className="ml-3 text-xs text-muted">
                                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                                </span>
                              </div>
                            </label>

                            {isChecked && config && (
                              <div className="mt-2 ml-7 space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted whitespace-nowrap">Required staff:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={config.requiredCount}
                                    onChange={(e) => updateShiftConfig(s.id, parseInt(e.target.value, 10) || 1)}
                                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>

                                {/* Rank capacity rules */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Rank limits (optional):</span>
                                    <button
                                      type="button"
                                      onClick={() => addRankConfig(s.id)}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      + Add rank limit
                                    </button>
                                  </div>
                                  {shiftRankConfigs.map((rc) => (
                                    <div key={rc._index} className="flex items-center gap-2">
                                      <select
                                        value={rc.rankId}
                                        onChange={(e) => updateRankConfig(rc._index, "rankId", e.target.value)}
                                        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      >
                                        {deptRanks.map((rank) => (
                                          <option key={rank.id} value={rank.id}>
                                            {rank.name}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="text-xs text-muted">max:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        value={rc.maxCount}
                                        onChange={(e) => updateRankConfig(rc._index, "maxCount", parseInt(e.target.value, 10) || 0)}
                                        className="w-14 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeRankConfig(rc._index)}
                                        className="text-xs text-destructive hover:underline"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No active shifts configured for this department.</p>
                  )}
                </div>

                {/* Staff selection */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Staff ({deptStaff.filter((s) => s.included).length}/{deptStaff.length} included)
                    </p>
                  </div>
                  {deptStaff.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-surface">
                          <tr>
                            <th className="px-3 py-2 font-medium text-muted w-10"></th>
                            <th className="px-3 py-2 font-medium text-muted">Name</th>
                            <th className="px-3 py-2 font-medium text-muted">Rank</th>
                            <th className="px-3 py-2 font-medium text-muted">Limit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deptStaff.map((s) => (
                            <tr
                              key={s.id}
                              className="border-t border-border cursor-pointer hover:bg-surface/50"
                              onClick={() => toggleStaff(s.id)}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={s.included}
                                  onChange={() => toggleStaff(s.id)}
                                  className="h-4 w-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary"
                                />
                              </td>
                              <td className="px-3 py-2 text-foreground">{s.full_name}</td>
                              <td className="px-3 py-2 text-muted">{s.rank_name || "\u2014"}</td>
                              <td className="px-3 py-2 text-muted text-xs">
                                {s.pay_type === "hourly"
                                  ? `${s.hours_per_week}h/wk`
                                  : `${s.days_per_week}d/wk`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No active staff in this department.</p>
                  )}
                </div>

                {/* Generate empty grid */}
                <div className="space-y-3">
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm font-medium text-primary">
                      {allowSelfScheduling ? "Self-Scheduling Mode" : "Manager-Assigned Mode"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {allowSelfScheduling
                        ? "An empty roster grid will be created. After publishing, staff can pick their own shifts. You can also assign shifts manually. Validation rules are enforced on each assignment."
                        : "An empty roster grid will be created. You must assign shifts for all staff before publishing. Validation rules are enforced on each assignment."}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateGrid}
                    disabled={
                      checkedShifts.size === 0 ||
                      deptStaff.filter((s) => s.included).length === 0 ||
                      !startDate ||
                      !endDate
                    }
                  >
                    Create Roster Grid
                  </Button>
                </div>
              </>
            )}

            {loadingDeptData && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            )}
          </div>

          {/* Generated Roster Grid */}
          {generatedGrid && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Roster Grid
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setGeneratedGrid(null)}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSave("draft")}
                    disabled={saving || !rosterTitle}
                  >
                    {saving ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave("published")}
                    disabled={saving || !rosterTitle}
                  >
                    {saving ? "Saving..." : "Publish"}
                  </Button>
                </div>
              </div>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              {/* Shift key legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                {deptShifts
                  .filter((s) => checkedShifts.has(s.id))
                  .map((s) => {
                    const config = shiftConfigs.find((c) => c.shiftId === s.id);
                    return (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">
                          {s.short_key}
                        </span>
                        <span className="text-muted">
                          {s.name}
                          {config ? ` (${config.requiredCount} req)` : ""}
                        </span>
                      </span>
                    );
                  })}
                <span className="text-xs text-muted italic">Click cells to assign shifts</span>
              </div>

              {/* Excel-style grid */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface sticky top-0">
                    <tr>
                      <th className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-muted min-w-[160px] border-r border-border">
                        Staff
                      </th>
                      <th className="sticky left-[160px] z-10 bg-surface px-2 py-2 font-medium text-muted min-w-[80px] border-r border-border">
                        Rank
                      </th>
                      {getDates(generatedGrid).map((date) => (
                        <th
                          key={date}
                          className="px-2 py-2 text-center font-medium text-muted min-w-[56px] border-r border-border last:border-r-0"
                        >
                          {formatDateHeader(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptStaff
                      .filter((s) => s.included)
                      .map((staff) => (
                        <tr key={staff.id} className="border-t border-border">
                          <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium text-foreground border-r border-border">
                            {staff.full_name}
                          </td>
                          <td className="sticky left-[160px] z-10 bg-background px-2 py-2 text-muted border-r border-border">
                            {staff.rank_name || "\u2014"}
                          </td>
                          {getDates(generatedGrid).map((date) => {
                            const shiftId = generatedGrid[date]?.[staff.id];
                            const key = getShiftKey(shiftId);
                            return (
                              <td
                                key={date}
                                className={`px-2 py-2 text-center font-mono font-medium border-r border-border last:border-r-0 cursor-pointer hover:bg-surface/50 ${
                                  shiftId === null
                                    ? "text-muted"
                                    : "text-foreground"
                                }`}
                                onClick={() => openEditCell(staff.id, date, staff.full_name)}
                                title={`Click to assign: ${staff.full_name} on ${date}`}
                              >
                                {key}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Existing Rosters */}
          {existingRosters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Existing Rosters</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted">Title</th>
                      <th className="px-4 py-3 font-medium text-muted">Department</th>
                      <th className="px-4 py-3 font-medium text-muted">Period</th>
                      <th className="px-4 py-3 font-medium text-muted">Status</th>
                      <th className="px-4 py-3 font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRosters.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-foreground">
                          {r.departments?.name || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {r.start_date} to {r.end_date}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r.status === "published"
                                ? "bg-success/10 text-success"
                                : r.status === "draft"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-muted/20 text-muted"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleViewRoster(r)}>
                              View
                            </Button>
                            {r.status === "draft" && (
                              <Button size="sm" variant="ghost" onClick={() => handlePublishRoster(r)}>
                                Publish
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRoster(r.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Roster Detail */}
          {viewRoster && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {viewRoster.title}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {viewRoster.start_date} to {viewRoster.end_date}
                  </span>
                </h3>
                <Button size="sm" variant="secondary" onClick={() => { setViewRoster(null); setViewGrid(null); }}>
                  Close
                </Button>
              </div>

              {viewLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : viewGrid ? (
                <>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {viewShifts.map((s) => (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">{s.short_key}</span>
                        <span className="text-muted">{s.name}</span>
                      </span>
                    ))}
                  </div>

                  {canCreateRoster && (
                    <p className="text-xs text-muted italic">Click a cell to edit an assignment.</p>
                  )}
                  {viewSaveError && (
                    <p className="text-xs text-destructive">{viewSaveError}</p>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface">
                        <tr>
                          <th className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-muted min-w-[160px] border-r border-border">
                            Staff
                          </th>
                          <th className="sticky left-[160px] z-10 bg-surface px-2 py-2 font-medium text-muted min-w-[80px] border-r border-border">
                            Rank
                          </th>
                          {getDates(viewGrid).map((date) => (
                            <th
                              key={date}
                              className="px-2 py-2 text-center font-medium text-muted min-w-[56px] border-r border-border last:border-r-0"
                            >
                              {formatDateHeader(date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewStaff
                          .filter((s) => s.included)
                          .map((staff) => (
                            <tr key={staff.id} className="border-t border-border">
                              <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium text-foreground border-r border-border">
                                {staff.full_name}
                              </td>
                              <td className="sticky left-[160px] z-10 bg-background px-2 py-2 text-muted border-r border-border">
                                {staff.rank_name || "\u2014"}
                              </td>
                              {getDates(viewGrid).map((date) => {
                                const shiftId = viewGrid[date]?.[staff.id];
                                const key = getViewShiftKey(shiftId);
                                return (
                                  <td
                                    key={date}
                                    onClick={canCreateRoster ? () => openViewEditCell(staff.id, date, staff.full_name) : undefined}
                                    className={`px-2 py-2 text-center font-mono font-medium border-r border-border last:border-r-0 ${
                                      shiftId === null ? "text-muted" : "text-foreground"
                                    }${canCreateRoster ? " cursor-pointer hover:bg-surface/50" : ""}`}
                                  >
                                    {key}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ═══ Permission gate for non-visible tabs ═══ */}
      {activeTab === "create-roster" && !canCreateRoster && (
        <div className="mt-6 rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted">You do not have permission to create rosters.</p>
        </div>
      )}

      {/* ═══ EDIT CELL MODAL (with validation) ═══ */}
      <Modal
        isOpen={editCell !== null && !overrideConfirm}
        onClose={() => { setEditCell(null); setOverrideConfirm(null); }}
        title="Assign Shift"
      >
        {editCell && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">{editCell.userName}</p>
              <p className="text-xs text-muted">{editCell.date}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Shift</label>
              {/* Off option with underwork validation */}
              {(() => {
                const offBlocked = editOffValidation && !editOffValidation.available;
                return (
                  <label
                    className={`flex items-center gap-3 rounded-md border p-2 cursor-pointer ${
                      offBlocked
                        ? "border-warning/50 bg-warning/5 opacity-75"
                        : "border-border hover:bg-surface/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editShift"
                      checked={editShiftId === "off"}
                      onChange={() => setEditShiftId("off")}
                      className="h-4 w-4 border border-border text-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-foreground">X Off</span>
                      {offBlocked && editOffValidation.reason && (
                        <p className="mt-0.5 text-xs text-warning">
                          {editOffValidation.reason} (override possible)
                        </p>
                      )}
                    </div>
                  </label>
                );
              })()}

              {/* Shift options with validation status */}
              {deptShifts
                .filter((s) => checkedShifts.has(s.id))
                .map((s) => {
                  const validation = cellAvailability[s.id];
                  const isUnavailable = validation && !validation.available;
                  const isOverridable = validation?.isOverridable;

                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 rounded-md border p-2 cursor-pointer ${
                        isUnavailable
                          ? isOverridable
                            ? "border-warning/50 bg-warning/5 opacity-75"
                            : "border-destructive/30 bg-destructive/5 opacity-50 cursor-not-allowed"
                          : "border-border hover:bg-surface/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="editShift"
                        checked={editShiftId === s.id}
                        onChange={() => setEditShiftId(s.id)}
                        disabled={isUnavailable && !isOverridable}
                        className="h-4 w-4 border border-border text-primary focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-foreground">
                          {s.short_key} - {s.name}
                        </span>
                        <span className="ml-2 text-xs text-muted">
                          ({s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})
                        </span>
                        {isUnavailable && validation.reason && (
                          <p className={`mt-0.5 text-xs ${isOverridable ? "text-warning" : "text-destructive"}`}>
                            {validation.reason}
                            {isOverridable && " (override possible)"}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditCell(null); setOverrideConfirm(null); }}>
                Cancel
              </Button>
              <Button onClick={handleEditCellSave}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ OVERRIDE CONFIRMATION MODAL ═══ */}
      <Modal
        isOpen={overrideConfirm !== null}
        onClose={() => setOverrideConfirm(null)}
        title="Override Validation"
      >
        {overrideConfirm && (
          <div className="space-y-4">
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-medium text-warning">Validation Warning</p>
              <p className="mt-1 text-sm text-foreground">{overrideConfirm.reason}</p>
            </div>
            {overrideConfirm.isHoursExceeded ? (
              <>
                <p className="text-sm text-muted">
                  This staff member has exceeded their hours/days limit. You can create an overtime record for this assignment, or assign without overtime.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOverrideConfirm(null)}>
                    Cancel
                  </Button>
                  <Button variant="secondary" onClick={handleOverrideConfirm}>
                    Assign Without Overtime
                  </Button>
                  <Button onClick={handleOvertimeAndAssign}>
                    Create Overtime &amp; Assign
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Are you sure you want to override this validation rule and assign this shift anyway?
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOverrideConfirm(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleOverrideConfirm}>
                    Override &amp; Assign
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ VIEW ROSTER EDIT CELL MODAL ═══ */}
      <Modal
        isOpen={viewEditCell !== null && !viewOverrideConfirm}
        onClose={() => { setViewEditCell(null); setViewOverrideConfirm(null); }}
        title="Edit Assignment"
      >
        {viewEditCell && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">{viewEditCell.userName}</p>
              <p className="text-xs text-muted">{viewEditCell.date}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Shift</label>
              {/* Off option with underwork validation */}
              {(() => {
                const offBlocked = viewEditOffValidation && !viewEditOffValidation.available;
                return (
                  <label
                    className={`flex items-center gap-3 rounded-md border p-2 cursor-pointer ${
                      offBlocked
                        ? "border-warning/50 bg-warning/5 opacity-75"
                        : "border-border hover:bg-surface/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="viewEditShift"
                      checked={viewEditShiftId === "off"}
                      onChange={() => setViewEditShiftId("off")}
                      className="h-4 w-4 border border-border text-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-foreground">X Off</span>
                      {offBlocked && viewEditOffValidation.reason && (
                        <p className="mt-0.5 text-xs text-warning">
                          {viewEditOffValidation.reason} (override possible)
                        </p>
                      )}
                    </div>
                  </label>
                );
              })()}

              {viewShifts.map((s) => {
                const validation = viewCellAvailability[s.id];
                const isUnavailable = validation && !validation.available;
                const isOverridable = validation?.isOverridable;

                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border p-2 cursor-pointer ${
                      isUnavailable
                        ? isOverridable
                          ? "border-warning/50 bg-warning/5 opacity-75"
                          : "border-destructive/30 bg-destructive/5 opacity-50 cursor-not-allowed"
                        : "border-border hover:bg-surface/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="viewEditShift"
                      checked={viewEditShiftId === s.id}
                      onChange={() => setViewEditShiftId(s.id)}
                      disabled={isUnavailable && !isOverridable}
                      className="h-4 w-4 border border-border text-primary focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-foreground">
                        {s.short_key} - {s.name}
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        ({s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)})
                      </span>
                      {isUnavailable && validation.reason && (
                        <p className={`mt-0.5 text-xs ${isOverridable ? "text-warning" : "text-destructive"}`}>
                          {validation.reason}
                          {isOverridable && " (override possible)"}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setViewEditCell(null); setViewOverrideConfirm(null); }}>
                Cancel
              </Button>
              <Button onClick={handleViewEditCellSave} disabled={viewSaving}>
                {viewSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ VIEW ROSTER OVERRIDE MODAL ═══ */}
      <Modal
        isOpen={viewOverrideConfirm !== null}
        onClose={() => setViewOverrideConfirm(null)}
        title="Override Validation"
      >
        {viewOverrideConfirm && (
          <div className="space-y-4">
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-medium text-warning">Validation Warning</p>
              <p className="mt-1 text-sm text-foreground">{viewOverrideConfirm.reason}</p>
            </div>
            {viewOverrideConfirm.isHoursExceeded ? (
              <>
                <p className="text-sm text-muted">
                  This staff member has exceeded their hours/days limit. You can create an overtime record for this assignment, or assign without overtime.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setViewOverrideConfirm(null)}>
                    Cancel
                  </Button>
                  <Button variant="secondary" onClick={handleViewOverrideConfirm} disabled={viewSaving}>
                    Assign Without Overtime
                  </Button>
                  <Button onClick={handleViewOvertimeAndAssign} disabled={viewSaving}>
                    {viewSaving ? "Saving..." : "Create Overtime & Assign"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Are you sure you want to override this validation rule and assign this shift anyway?
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setViewOverrideConfirm(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleViewOverrideConfirm} disabled={viewSaving}>
                    {viewSaving ? "Saving..." : "Override & Assign"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ SELF-SCHEDULE PICKER MODAL ═══ */}
      <Modal
        isOpen={selfScheduleModalRoster !== null}
        onClose={() => setSelfScheduleModalRoster(null)}
        title="Pick Your Shifts"
      >
        {selfScheduleModalRoster && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">
                {selfScheduleModalRoster.title}
              </p>
              <p className="text-xs text-muted">
                {selfScheduleModalRoster.department_name} &middot;{" "}
                {selfScheduleModalRoster.start_date} to {selfScheduleModalRoster.end_date}
              </p>
            </div>

            {selfScheduleLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {getDateRange(selfScheduleModalRoster.start_date, selfScheduleModalRoster.end_date).map((date) => {
                  const selected = selfScheduleSelections[date] ?? null;
                  const dayAvailability = selfScheduleAvailability[date] ?? {};
                  const isOff = selected === "off";
                  const offValidation = selfScheduleOffAvailability[date];
                  const isOffBlocked = offValidation && !offValidation.available && !isOff;

                  return (
                    <div
                      key={date}
                      className={`rounded-lg border p-3 ${
                        selected ? "border-green-500 bg-green-500/5" : "border-border"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground mb-2">{formatDateHeader(date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {/* Off (X) button — disabled when it would cause underwork */}
                        <button
                          type="button"
                          onClick={() => !isOffBlocked && handleSelfScheduleDateShift(date, "off")}
                          disabled={!!isOffBlocked}
                          title={isOffBlocked ? (offValidation.reason ?? "Cannot take day off") : "Day off (0 hours)"}
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isOff
                              ? "border-green-500 bg-green-500/10 text-green-700"
                              : isOffBlocked
                                ? "border-border bg-surface/50 text-muted opacity-40 cursor-not-allowed"
                                : "border-border bg-background text-foreground hover:bg-surface/50 cursor-pointer"
                          }`}
                        >
                          <span className="font-mono">X</span>
                          <span className="ml-1">Off</span>
                          {isOffBlocked && offValidation.reason && (
                            <span className="block text-[10px] text-destructive font-normal mt-0.5">
                              {offValidation.reason}
                            </span>
                          )}
                        </button>

                        {/* Shift buttons — disabled when validation fails */}
                        {selfScheduleModalRoster.shifts.map((s) => {
                          const validation = dayAvailability[s.id];
                          const isUnavailable = validation && !validation.available;
                          const isSelected = selected === s.id;

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => !isUnavailable && handleSelfScheduleDateShift(date, s.id)}
                              disabled={!!isUnavailable}
                              title={isUnavailable ? (validation.reason ?? "Unavailable") : `${s.name} (${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)})`}
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "border-green-500 bg-green-500/10 text-green-700"
                                  : isUnavailable
                                    ? "border-border bg-surface/50 text-muted opacity-40 cursor-not-allowed"
                                    : "border-border bg-background text-foreground hover:bg-surface/50 cursor-pointer"
                              }`}
                            >
                              <span className="font-mono">{s.short_key}</span>
                              <span className="ml-1">{s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}</span>
                              {isUnavailable && validation.reason && (
                                <span className="block text-[10px] text-destructive font-normal mt-0.5">
                                  {validation.reason}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {selected && (
                          <button
                            type="button"
                            onClick={() => handleSelfScheduleDateShift(date, selected)}
                            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface/50 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selfScheduleError && (
              <p className="text-xs text-destructive">{selfScheduleError}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                {Object.keys(selfScheduleSelections).length} day(s) selected, {Object.values(selfScheduleSelections).filter((v) => v !== "off").length} shift(s)
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelfScheduleModalRoster(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSelfScheduleSubmit}
                  disabled={selfScheduleSaving || Object.values(selfScheduleSelections).filter(Boolean).length === 0}
                >
                  {selfScheduleSaving ? "Saving..." : "Save Selections"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainContent>
  );
}
