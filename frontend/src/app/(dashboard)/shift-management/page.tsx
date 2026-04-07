"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import FormCheckbox from "@/components/ui/FormCheckbox";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { Permission } from "@/types/permission";
import { Department } from "@/types/department";
import { Shift } from "@/types/shift";
import { Roster, UnderstaffedSlot } from "@/types/roster";
import { generateRoster } from "@/lib/roster-generator";
import { GenerationShift, GenerationStaffMember } from "@/types/roster";

type ShiftTab = "my-shifts" | "create-roster" | "create-overtime";

interface StaffRow {
  id: string;
  full_name: string;
  rank_name: string | null;
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
  const [selfScheduleDate, setSelfScheduleDate] = useState("");
  const [selfScheduleShiftId, setSelfScheduleShiftId] = useState("");
  const [selfScheduleSaving, setSelfScheduleSaving] = useState(false);

  // Create Roster state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptShifts, setDeptShifts] = useState<Shift[]>([]);
  const [deptStaff, setDeptStaff] = useState<StaffRow[]>([]);
  const [checkedShifts, setCheckedShifts] = useState<Set<string>>(new Set());
  const [rosterTitle, setRosterTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minStaff, setMinStaff] = useState("1");
  const [maxStaff, setMaxStaff] = useState("5");
  const [allowSelfScheduling, setAllowSelfScheduling] = useState(false);
  const [generatedGrid, setGeneratedGrid] = useState<Record<string, Record<string, string | null>> | null>(null);
  const [understaffedSlots, setUnderstaffedSlots] = useState<UnderstaffedSlot[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingDeptData, setLoadingDeptData] = useState(false);

  // Edit cell modal
  const [editCell, setEditCell] = useState<{ userId: string; date: string; userName: string } | null>(null);
  const [editShiftId, setEditShiftId] = useState<string>("off");

  // Existing rosters state
  const [existingRosters, setExistingRosters] = useState<ExistingRoster[]>([]);
  const [viewRoster, setViewRoster] = useState<ExistingRoster | null>(null);
  const [viewGrid, setViewGrid] = useState<Record<string, Record<string, string | null>> | null>(null);
  const [viewShifts, setViewShifts] = useState<Shift[]>([]);
  const [viewStaff, setViewStaff] = useState<StaffRow[]>([]);
  const [viewUnderstaffed, setViewUnderstaffed] = useState<UnderstaffedSlot[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Overtime tab state
  const [overtimeRosters, setOvertimeRosters] = useState<ExistingRoster[]>([]);
  const [overtimeSlots, setOvertimeSlots] = useState<UnderstaffedSlot[]>([]);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeSlot, setOvertimeSlot] = useState<UnderstaffedSlot | null>(null);
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeReason, setOvertimeReason] = useState("");
  const [overtimeSaving, setOvertimeSaving] = useState(false);

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
  const canCreateOvertime = permissions.includes("create_overtime");

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
    setSelfScheduleDate("");
    setSelfScheduleShiftId("");
  }

  async function handleSelfScheduleSubmit() {
    if (!selfScheduleModalRoster || !selfScheduleDate || !selfScheduleShiftId) return;
    setSelfScheduleSaving(true);

    const res = await fetch(`/api/rosters/${selfScheduleModalRoster.roster_id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        date: selfScheduleDate,
        shift_id: selfScheduleShiftId,
        is_self_scheduled: true,
      }),
    });

    setSelfScheduleSaving(false);
    if (res.ok) {
      setSelfScheduleModalRoster(null);
      fetchMyShifts();
    }
  }

  // ─── Department data fetch ────────────────────────────────

  async function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId);
    setCheckedShifts(new Set());
    setDeptShifts([]);
    setDeptStaff([]);
    setGeneratedGrid(null);
    setUnderstaffedSlots([]);
    if (!deptId) return;

    setLoadingDeptData(true);
    const supabase = createClient();

    const [{ data: shifts }, { data: profiles }] = await Promise.all([
      supabase
        .from("shifts")
        .select("id, department_id, name, short_key, start_time, end_time, break_minutes, min_hours_per_week, max_hours_per_week, is_active, created_at, updated_at")
        .eq("department_id", deptId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, rank_id, ranks(name)")
        .eq("department_id", deptId)
        .eq("status", "active"),
    ]);

    if (shifts) setDeptShifts(shifts as Shift[]);

    if (profiles) {
      interface ProfileWithRank {
        id: string;
        full_name: string;
        rank_id: string | null;
        ranks: { name: string } | null;
      }
      const staff: StaffRow[] = (profiles as unknown as ProfileWithRank[]).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        rank_name: p.ranks?.name ?? null,
        included: true,
      }));
      setDeptStaff(staff);
    }
    setLoadingDeptData(false);
  }

  function toggleShift(shiftId: string) {
    setCheckedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
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

  // ─── Generate Roster ──────────────────────────────────────

  function handleGenerate() {
    if (!startDate || !endDate || checkedShifts.size === 0) return;

    setGenerating(true);
    setSaveError("");

    const selectedShifts: GenerationShift[] = deptShifts
      .filter((s) => checkedShifts.has(s.id))
      .map((s) => ({
        id: s.id,
        short_key: s.short_key,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
        break_minutes: s.break_minutes,
        min_hours_per_week: s.min_hours_per_week,
        max_hours_per_week: s.max_hours_per_week,
      }));

    const includedStaff: GenerationStaffMember[] = deptStaff
      .filter((s) => s.included)
      .map((s) => ({
        id: s.id,
        full_name: s.full_name,
        rank_name: s.rank_name,
      }));

    const result = generateRoster({
      shifts: selectedShifts,
      staff: includedStaff,
      startDate,
      endDate,
      minStaffPerShift: parseInt(minStaff, 10) || 1,
      maxStaffPerShift: parseInt(maxStaff, 10) || 5,
    });

    setGeneratedGrid(result.assignments);
    setUnderstaffedSlots(result.understaffed);
    setGenerating(false);
  }

  // ─── Edit Cell ────────────────────────────────────────────

  function openEditCell(uid: string, date: string, userName: string) {
    const currentShift = generatedGrid?.[date]?.[uid];
    setEditCell({ userId: uid, date, userName });
    setEditShiftId(currentShift ?? "off");
  }

  function handleEditCellSave() {
    if (!editCell || !generatedGrid) return;
    const updated = { ...generatedGrid };
    const dayMap = { ...updated[editCell.date] };
    dayMap[editCell.userId] = editShiftId === "off" ? null : editShiftId;
    updated[editCell.date] = dayMap;
    setGeneratedGrid(updated);
    setEditCell(null);
  }

  // ─── Save Roster ──────────────────────────────────────────

  async function handleSaveSelfSchedule(status: "draft" | "published") {
    if (!rosterTitle || !selectedDeptId || !startDate || !endDate) return;
    setSaving(true);
    setSaveError("");

    // Build blank grid: all included staff get null (off) for every date
    const dates: string[] = [];
    const current = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    const includedIds = deptStaff.filter((s) => s.included).map((s) => s.id);
    const blankGrid: Record<string, Record<string, string | null>> = {};
    for (const d of dates) {
      const day: Record<string, string | null> = {};
      for (const uid of includedIds) {
        day[uid] = null;
      }
      blankGrid[d] = day;
    }

    const res = await fetch("/api/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: rosterTitle,
        department_id: selectedDeptId,
        start_date: startDate,
        end_date: endDate,
        allow_self_scheduling: true,
        min_staff_per_shift: parseInt(minStaff, 10) || 1,
        max_staff_per_shift: parseInt(maxStaff, 10) || 5,
        shift_ids: Array.from(checkedShifts),
        staff_ids: includedIds,
        assignments: blankGrid,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setSaveError(body.error || "Failed to save roster");
      setSaving(false);
      return;
    }

    const json = await res.json();
    const rosterId = json.data?.id;

    if (status === "published" && rosterId) {
      await fetch(`/api/rosters/${rosterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
    }

    setSaving(false);
    resetForm();
    fetchExistingRosters();
  }

  async function handleSave(status: "draft" | "published") {
    if (!generatedGrid || !rosterTitle || !selectedDeptId) return;
    setSaving(true);
    setSaveError("");

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
        min_staff_per_shift: parseInt(minStaff, 10) || 1,
        max_staff_per_shift: parseInt(maxStaff, 10) || 5,
        shift_ids: Array.from(checkedShifts),
        staff_ids: includedIds,
        assignments: generatedGrid,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setSaveError(body.error || "Failed to save roster");
      setSaving(false);
      return;
    }

    const json = await res.json();
    const rosterId = json.data?.id;

    if (status === "published" && rosterId) {
      await fetch(`/api/rosters/${rosterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
    }

    setSaving(false);
    resetForm();
    fetchExistingRosters();
  }

  function resetForm() {
    setRosterTitle("");
    setSelectedDeptId("");
    setDeptShifts([]);
    setDeptStaff([]);
    setCheckedShifts(new Set());
    setStartDate("");
    setEndDate("");
    setMinStaff("1");
    setMaxStaff("5");
    setAllowSelfScheduling(false);
    setGeneratedGrid(null);
    setUnderstaffedSlots([]);
    setSaveError("");
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
        profiles: { id: string; full_name: string; ranks: { name: string } | null } | null;
      }
      interface AssignmentRow {
        user_id: string;
        date: string;
        shift_id: string | null;
      }

      const shiftRows = data.roster_shifts as RosterShiftRow[];
      const staffRows = data.roster_staff as RosterStaffRow[];
      const assignmentRows = data.assignments as AssignmentRow[];

      setViewShifts(
        shiftRows
          .filter((r: RosterShiftRow) => r.shifts)
          .map((r: RosterShiftRow) => r.shifts as Shift)
      );

      setViewStaff(
        staffRows.map((r: RosterStaffRow) => ({
          id: r.user_id,
          full_name: r.profiles?.full_name ?? "",
          rank_name: r.profiles?.ranks?.name ?? null,
          included: r.is_included,
        }))
      );

      const grid: Record<string, Record<string, string | null>> = {};
      for (const a of assignmentRows) {
        if (!grid[a.date]) grid[a.date] = {};
        grid[a.date][a.user_id] = a.shift_id;
      }
      setViewGrid(grid);

      const shiftMap: Record<string, Shift> = {};
      for (const r of shiftRows) {
        if (r.shifts) shiftMap[r.shifts.id] = r.shifts;
      }

      const uSlots: UnderstaffedSlot[] = [];
      const dates = Object.keys(grid).sort();
      for (const date of dates) {
        const dayMap = grid[date];
        const shiftCounts: Record<string, number> = {};
        for (const shiftId of Object.values(dayMap)) {
          if (shiftId) {
            shiftCounts[shiftId] = (shiftCounts[shiftId] || 0) + 1;
          }
        }
        for (const shift of shiftRows) {
          if (!shift.shifts) continue;
          const count = shiftCounts[shift.shift_id] || 0;
          if (count < roster.min_staff_per_shift) {
            uSlots.push({
              date,
              shift_id: shift.shift_id,
              shift_name: shift.shifts.name,
              shift_key: shift.shifts.short_key,
              assigned_count: count,
              min_required: roster.min_staff_per_shift,
            });
          }
        }
      }
      setViewUnderstaffed(uSlots);
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

  // ─── Overtime tab ─────────────────────────────────────────

  const fetchOvertimeData = useCallback(async () => {
    setOvertimeLoading(true);
    const res = await fetch("/api/rosters?status=published");
    const json = await res.json();
    const rosters: ExistingRoster[] = json.data ?? [];
    setOvertimeRosters(rosters);

    const allSlots: UnderstaffedSlot[] = [];
    for (const roster of rosters) {
      const detailRes = await fetch(`/api/rosters/${roster.id}`);
      const detailJson = await detailRes.json();
      const data = detailJson.data;
      if (!data) continue;

      interface MiniShiftRow {
        shift_id: string;
        shifts: { id: string; name: string; short_key: string } | null;
      }
      interface MiniAssignment {
        user_id: string;
        date: string;
        shift_id: string | null;
      }

      const shiftRows = data.roster_shifts as MiniShiftRow[];
      const assignments = data.assignments as MiniAssignment[];

      const grid: Record<string, Record<string, string | null>> = {};
      for (const a of assignments) {
        if (!grid[a.date]) grid[a.date] = {};
        grid[a.date][a.user_id] = a.shift_id;
      }

      const dates = Object.keys(grid).sort();
      for (const date of dates) {
        const dayMap = grid[date];
        const shiftCounts: Record<string, number> = {};
        for (const sid of Object.values(dayMap)) {
          if (sid) shiftCounts[sid] = (shiftCounts[sid] || 0) + 1;
        }
        for (const sr of shiftRows) {
          if (!sr.shifts) continue;
          const count = shiftCounts[sr.shift_id] || 0;
          if (count < roster.min_staff_per_shift) {
            allSlots.push({
              date,
              shift_id: sr.shift_id,
              shift_name: sr.shifts.name,
              shift_key: sr.shifts.short_key,
              assigned_count: count,
              min_required: roster.min_staff_per_shift,
            });
          }
        }
      }
    }
    setOvertimeSlots(allSlots);
    setOvertimeLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "create-overtime" && canCreateOvertime) {
      fetchOvertimeData();
    }
  }, [activeTab, canCreateOvertime, fetchOvertimeData]);

  function openOvertimeRequest(slot: UnderstaffedSlot) {
    setOvertimeSlot(slot);
    setOvertimeHours("");
    setOvertimeReason(`Overtime needed: ${slot.shift_name} shift on ${slot.date} (understaffed by ${slot.min_required - slot.assigned_count})`);
    setShowOvertimeModal(true);
  }

  async function handleOvertimeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!overtimeSlot) return;
    setOvertimeSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const parsedHours = parseFloat(overtimeHours);
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setOvertimeSaving(false);
      return;
    }

    await supabase.from("overtime").insert({
      user_id: user.id,
      date: overtimeSlot.date,
      hours: parsedHours,
      reason: overtimeReason,
    });

    setShowOvertimeModal(false);
    setOvertimeSaving(false);
  }

  // ─── Helpers ──────────────────────────────────────────────

  function getShiftKey(shiftId: string | null): string {
    if (!shiftId) return "X";
    const shift = deptShifts.find((s) => s.id === shiftId);
    return shift?.short_key || "?";
  }

  function getViewShiftKey(shiftId: string | null): string {
    if (!shiftId) return "X";
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

  function isUnderstaffedCell(date: string, shiftId: string | null): boolean {
    if (!shiftId) return false;
    return understaffedSlots.some(
      (u) => u.date === date && u.shift_id === shiftId
    );
  }

  // ─── Tab definitions ──────────────────────────────────────

  const tabs: { key: ShiftTab; label: string; visible: boolean }[] = [
    { key: "my-shifts", label: "My Shifts", visible: true },
    { key: "create-roster", label: "Create Roster", visible: canCreateRoster },
    { key: "create-overtime", label: "Create Overtime", visible: canCreateOvertime },
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

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Min Staff per Shift"
                    type="number"
                    value={minStaff}
                    onChange={(e) => setMinStaff(e.target.value)}
                    min="1"
                  />
                  <FormInput
                    label="Max Staff per Shift"
                    type="number"
                    value={maxStaff}
                    onChange={(e) => setMaxStaff(e.target.value)}
                    min="1"
                  />
                </div>

                <FormCheckbox
                  label="Allow self-scheduling (staff can select their own shifts within the rules)"
                  checked={allowSelfScheduling}
                  onChange={(e) => setAllowSelfScheduling(e.target.checked)}
                />

                {/* Shift selection */}
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Available Shifts</p>
                  {deptShifts.length > 0 ? (
                    <div className="space-y-2">
                      {deptShifts.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 rounded-md border border-border p-2.5 cursor-pointer hover:bg-surface"
                        >
                          <input
                            type="checkbox"
                            checked={checkedShifts.has(s.id)}
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
                      ))}
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No active staff in this department.</p>
                  )}
                </div>

                {/* Generate / Self-Schedule button */}
                {allowSelfScheduling ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-sm font-medium text-primary">Self-Scheduling Mode</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Staff included in this roster will see it under My Shifts and can pick their own shifts within the configured rules. No auto-generation needed.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveSelfSchedule("draft")}
                        disabled={
                          saving ||
                          checkedShifts.size === 0 ||
                          deptStaff.filter((s) => s.included).length === 0 ||
                          !startDate ||
                          !endDate ||
                          !rosterTitle
                        }
                      >
                        {saving ? "Saving..." : "Save as Draft"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleSaveSelfSchedule("published")}
                        disabled={
                          saving ||
                          checkedShifts.size === 0 ||
                          deptStaff.filter((s) => s.included).length === 0 ||
                          !startDate ||
                          !endDate ||
                          !rosterTitle
                        }
                      >
                        {saving ? "Saving..." : "Save & Publish"}
                      </Button>
                    </div>
                    {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerate}
                      disabled={
                        generating ||
                        checkedShifts.size === 0 ||
                        deptStaff.filter((s) => s.included).length === 0 ||
                        !startDate ||
                        !endDate
                      }
                    >
                      {generating ? "Generating..." : "Auto-Generate Roster"}
                    </Button>
                    {generatedGrid && (
                      <Button variant="secondary" onClick={() => setGeneratedGrid(null)}>
                        Clear
                      </Button>
                    )}
                  </div>
                )}
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
                  Generated Roster Preview
                </h3>
                <div className="flex gap-2">
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

              {understaffedSlots.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
                  <p className="text-sm font-medium text-warning">
                    {understaffedSlots.length} understaffed slot{understaffedSlots.length > 1 ? "s" : ""} detected
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Cells marked &quot;U&quot; indicate shifts with fewer staff than the minimum required.
                  </p>
                </div>
              )}

              {/* Shift key legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                {deptShifts
                  .filter((s) => checkedShifts.has(s.id))
                  .map((s) => (
                    <span key={s.id} className="flex items-center gap-1">
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">
                        {s.short_key}
                      </span>
                      <span className="text-muted">{s.name}</span>
                    </span>
                  ))}
                <span className="flex items-center gap-1">
                  <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">X</span>
                  <span className="text-muted">Off</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded bg-warning/20 px-1.5 py-0.5 font-mono font-medium text-warning">U</span>
                  <span className="text-muted">Understaffed</span>
                </span>
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
                            const isUnder = isUnderstaffedCell(date, shiftId);
                            return (
                              <td
                                key={date}
                                className={`px-2 py-2 text-center font-mono font-medium border-r border-border last:border-r-0 cursor-pointer hover:bg-surface/50 ${
                                  shiftId === null
                                    ? "text-muted"
                                    : isUnder
                                      ? "bg-warning/10 text-warning"
                                      : "text-foreground"
                                }`}
                                onClick={() => openEditCell(staff.id, date, staff.full_name)}
                                title={`Click to edit: ${staff.full_name} on ${date}`}
                              >
                                {isUnder ? "U" : key}
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

          {/* View Roster Detail Modal */}
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
                  {viewUnderstaffed.length > 0 && (
                    <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
                      <p className="text-sm font-medium text-warning">
                        {viewUnderstaffed.length} understaffed slot{viewUnderstaffed.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs">
                    {viewShifts.map((s) => (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">{s.short_key}</span>
                        <span className="text-muted">{s.name}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1">
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-medium">X</span>
                      <span className="text-muted">Off</span>
                    </span>
                  </div>

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
                                    className={`px-2 py-2 text-center font-mono font-medium border-r border-border last:border-r-0 ${
                                      shiftId === null ? "text-muted" : "text-foreground"
                                    }`}
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

      {/* ═══ CREATE OVERTIME TAB ═══ */}
      {activeTab === "create-overtime" && canCreateOvertime && (
        <div className="mt-6">
          {overtimeLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : overtimeSlots.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                The following shifts are understaffed in published rosters. You can request overtime to fill these gaps.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted">Date</th>
                      <th className="px-4 py-3 font-medium text-muted">Shift</th>
                      <th className="px-4 py-3 font-medium text-muted">Assigned</th>
                      <th className="px-4 py-3 font-medium text-muted">Required</th>
                      <th className="px-4 py-3 font-medium text-muted">Shortage</th>
                      <th className="px-4 py-3 font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeSlots.map((slot, i) => (
                      <tr key={`${slot.date}-${slot.shift_id}-${i}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-foreground">{slot.date}</td>
                        <td className="px-4 py-3 text-foreground">
                          <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-medium">
                            {slot.shift_key}
                          </span>
                          <span className="ml-2">{slot.shift_name}</span>
                        </td>
                        <td className="px-4 py-3 text-foreground">{slot.assigned_count}</td>
                        <td className="px-4 py-3 text-foreground">{slot.min_required}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            {slot.min_required - slot.assigned_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="secondary" onClick={() => openOvertimeRequest(slot)}>
                            Request Overtime
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
              <p className="text-sm text-muted">No understaffed shifts found.</p>
              <p className="mt-1 text-xs text-muted">
                When published rosters have shifts below the minimum staffing level, they will appear here.
              </p>
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
      {activeTab === "create-overtime" && !canCreateOvertime && (
        <div className="mt-6 rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted">You do not have permission to create overtime requests.</p>
        </div>
      )}

      {/* ═══ EDIT CELL MODAL ═══ */}
      <Modal
        isOpen={editCell !== null}
        onClose={() => setEditCell(null)}
        title="Edit Shift Assignment"
      >
        {editCell && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">{editCell.userName}</p>
              <p className="text-xs text-muted">{editCell.date}</p>
            </div>
            <FormSelect
              label="Shift"
              value={editShiftId}
              onChange={(e) => setEditShiftId(e.target.value)}
              options={[
                { value: "off", label: "X - Off" },
                ...deptShifts
                  .filter((s) => checkedShifts.has(s.id))
                  .map((s) => ({
                    value: s.id,
                    label: `${s.short_key} - ${s.name} (${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)})`,
                  })),
              ]}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditCell(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditCellSave}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ OVERTIME REQUEST MODAL ═══ */}
      <Modal
        isOpen={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        title="Request Overtime"
      >
        {overtimeSlot && (
          <form onSubmit={handleOvertimeSubmit} className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">
                {overtimeSlot.shift_name} shift
              </p>
              <p className="text-xs text-muted">
                {overtimeSlot.date} - Shortage of{" "}
                {overtimeSlot.min_required - overtimeSlot.assigned_count} staff
              </p>
            </div>
            <FormInput
              label="Hours"
              type="number"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              placeholder="e.g. 8"
              required
              min="0.5"
              max="24"
              step="0.5"
            />
            <FormInput
              label="Reason"
              type="text"
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
              placeholder="Reason for overtime request"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowOvertimeModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={overtimeSaving}>
                {overtimeSaving ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══ SELF-SCHEDULE PICKER MODAL ═══ */}
      <Modal
        isOpen={selfScheduleModalRoster !== null}
        onClose={() => setSelfScheduleModalRoster(null)}
        title="Pick a Shift"
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
            <FormInput
              label="Date"
              type="date"
              value={selfScheduleDate}
              onChange={(e) => setSelfScheduleDate(e.target.value)}
              min={selfScheduleModalRoster.start_date}
              max={selfScheduleModalRoster.end_date}
              required
            />
            <FormSelect
              label="Shift"
              value={selfScheduleShiftId}
              onChange={(e) => setSelfScheduleShiftId(e.target.value)}
              placeholder="Select a shift"
              options={selfScheduleModalRoster.shifts.map((s) => ({
                value: s.id,
                label: `${s.short_key} - ${s.name} (${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)})`,
              }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelfScheduleModalRoster(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSelfScheduleSubmit}
                disabled={selfScheduleSaving || !selfScheduleDate || !selfScheduleShiftId}
              >
                {selfScheduleSaving ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainContent>
  );
}
