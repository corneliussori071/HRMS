"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { LeaveType, LeaveAllocation, LeaveSystemType } from "@/types/leave-config";
import { Department } from "@/types/department";
import { Rank } from "@/types/department-config";

interface RankAllocInput {
  days_per_year: string;
  hours_worked: string;
  hours_earned: string;
}

const SYSTEM_TYPE_OPTIONS = [
  { value: "pto", label: "PTO (combined pool)" },
  { value: "fixed", label: "Fixed (per-type allocation)" },
  { value: "both", label: "Both systems" },
];
const LEAVE_SYSTEM_OPTIONS = [
  { value: "pto", label: "PTO" },
  { value: "fixed", label: "Fixed" },
];

export default function LeaveSettingsPage() {
  const [leaveSystem, setLeaveSystem] = useState<LeaveSystemType>("fixed");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);

  // Leave type form
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editType, setEditType] = useState<LeaveType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeSystem, setTypeSystem] = useState("fixed");
  const [typeDept, setTypeDept] = useState("");
  const [typeMaxDays, setTypeMaxDays] = useState("");
  const [typeRequiresApproval, setTypeRequiresApproval] = useState(true);
  const [rankAllocs, setRankAllocs] = useState<Record<string, RankAllocInput>>({});
  const [typeSaving, setTypeSaving] = useState(false);
  const [typeError, setTypeError] = useState("");

  const fetchAll = useCallback(async () => {
    const [settingsRes, typesRes, allocRes, deptRes, ranksRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/leave-types"),
      fetch("/api/leave-allocations"),
      fetch("/api/departments"),
      fetch("/api/ranks"),
    ]);

    const [settingsJson, typesJson, allocJson, deptJson, ranksJson] = await Promise.all([
      settingsRes.json(),
      typesRes.json(),
      allocRes.json(),
      deptRes.json(),
      ranksRes.json(),
    ]);

    if (settingsJson.data?.leave_system) {
      setLeaveSystem(settingsJson.data.leave_system as LeaveSystemType);
    }
    if (typesJson.data) setLeaveTypes(typesJson.data);
    if (allocJson.data) setAllocations(allocJson.data);
    if (deptJson.data) setDepartments(deptJson.data);
    if (ranksJson.data) setRanks(ranksJson.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSaveSystem(value: string) {
    setSavingSystem(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leave_system: value }),
    });
    setLeaveSystem(value as LeaveSystemType);
    setSavingSystem(false);
  }

  // Filtered ranks for selected department
  const deptRanks = typeDept ? ranks.filter((r) => r.department_id === typeDept && r.is_active) : [];

  // Initialize rank allocations when department changes
  function handleDeptChange(deptId: string) {
    setTypeDept(deptId);
    const deptR = deptId ? ranks.filter((r) => r.department_id === deptId && r.is_active) : [];
    const newAllocs: Record<string, RankAllocInput> = {};
    for (const r of deptR) {
      const existing = editType
        ? allocations.find((a) => a.leave_type_id === editType.id && a.rank_id === r.id)
        : null;
      newAllocs[r.id] = {
        days_per_year: existing ? String(existing.days_per_year) : "",
        hours_worked: existing ? String(existing.hours_worked) : "",
        hours_earned: existing ? String(existing.hours_earned) : "",
      };
    }
    setRankAllocs(newAllocs);
  }

  // Leave Type CRUD
  function openAddType() {
    setEditType(null);
    setTypeName("");
    setTypeDesc("");
    setTypeSystem("fixed");
    setTypeDept("");
    setTypeMaxDays("");
    setTypeRequiresApproval(true);
    setRankAllocs({});
    setTypeError("");
    setShowTypeModal(true);
  }

  function openEditType(lt: LeaveType) {
    setEditType(lt);
    setTypeName(lt.name);
    setTypeDesc(lt.description || "");
    setTypeSystem(lt.system_type);
    setTypeMaxDays(String(lt.max_days_per_year));
    setTypeRequiresApproval(lt.requires_approval);
    setTypeError("");

    // Set department and load rank allocations
    const deptId = lt.department_id || "";
    setTypeDept(deptId);
    if (deptId) {
      const deptR = ranks.filter((r) => r.department_id === deptId && r.is_active);
      const newAllocs: Record<string, RankAllocInput> = {};
      for (const r of deptR) {
        const existing = allocations.find((a) => a.leave_type_id === lt.id && a.rank_id === r.id);
        newAllocs[r.id] = {
          days_per_year: existing ? String(existing.days_per_year) : "",
          hours_worked: existing ? String(existing.hours_worked) : "",
          hours_earned: existing ? String(existing.hours_earned) : "",
        };
      }
      setRankAllocs(newAllocs);
    } else {
      setRankAllocs({});
    }

    setShowTypeModal(true);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault();
    setTypeSaving(true);
    setTypeError("");

    const url = editType ? `/api/leave-types/${editType.id}` : "/api/leave-types";
    const method = editType ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: typeName,
        description: typeDesc || null,
        system_type: typeSystem,
        department_id: typeDept || null,
        max_days_per_year: parseFloat(typeMaxDays) || 0,
        requires_approval: typeRequiresApproval,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setTypeError(body.error || "Failed to save leave type");
      setTypeSaving(false);
      return;
    }

    const savedType = await res.json();
    const leaveTypeId = savedType.data?.id || editType?.id;

    // Save rank-based allocations
    if (leaveTypeId && typeDept) {
      const allocPromises = Object.entries(rankAllocs)
        .filter(([, v]) => {
          if (typeSystem === "pto") return v.hours_worked || v.hours_earned;
          return v.days_per_year;
        })
        .map(([rankId, v]) =>
          fetch("/api/leave-allocations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leave_type_id: leaveTypeId,
              rank_id: rankId,
              days_per_year: parseFloat(v.days_per_year) || 0,
              hours_worked: parseFloat(v.hours_worked) || 0,
              hours_earned: parseFloat(v.hours_earned) || 0,
            }),
          })
        );
      await Promise.all(allocPromises);
    }

    setShowTypeModal(false);
    setTypeSaving(false);
    await fetchAll();
  }

  async function handleDeleteType(id: string) {
    const res = await fetch(`/api/leave-types/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAll();
  }

  async function handleToggleType(lt: LeaveType) {
    await fetch(`/api/leave-types/${lt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !lt.is_active }),
    });
    await fetchAll();
  }

  function getAllocsForType(typeId: string) {
    return allocations.filter((a) => a.leave_type_id === typeId);
  }

  function getRankName(rankId: string) {
    return ranks.find((r) => r.id === rankId)?.name || "Unknown";
  }

  function getDeptName(deptId: string | null) {
    if (!deptId) return null;
    return departments.find((d) => d.id === deptId)?.name || null;
  }

  async function handleDeleteAlloc(id: string) {
    const res = await fetch(`/api/leave-allocations/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAll();
  }

  const activeTypes = leaveTypes.filter((lt) => {
    if (leaveSystem === "both") return true;
    return lt.system_type === leaveSystem;
  });

  const deptOptions = [
    { value: "", label: "No department (org-wide)" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <MainContent
      title="Leave Settings"
      description="Configure leave system type, leave categories, and rank-based allocations."
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Leave System Selection */}
          <div className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">Leave System Type</h2>
            <p className="mt-1 text-xs text-muted">
              Choose how your organization manages leave: PTO (single combined pool), Fixed (per-category allocations), or Both.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <FormSelect
                label=""
                value={leaveSystem}
                onChange={(e) => handleSaveSystem(e.target.value)}
                options={SYSTEM_TYPE_OPTIONS}
                disabled={savingSystem}
              />
              {savingSystem && <span className="text-xs text-muted">Saving...</span>}
            </div>
          </div>

          {/* Leave Types */}
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Leave Types</h2>
                <p className="text-xs text-muted">
                  {leaveSystem === "both"
                    ? "Showing all leave types"
                    : `Showing ${leaveSystem === "pto" ? "PTO" : "fixed"} leave types`}
                </p>
              </div>
              <Button size="sm" onClick={openAddType}>
                Add Leave Type
              </Button>
            </div>

            <div className="divide-y divide-border">
              {activeTypes.length > 0 ? (
                activeTypes.map((lt) => {
                  const typeAllocs = getAllocsForType(lt.id);
                  const deptName = getDeptName(lt.department_id);
                  return (
                    <div key={lt.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{lt.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lt.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                              {lt.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                              {lt.system_type === "pto" ? "PTO" : "Fixed"}
                            </span>
                          </div>
                          {lt.description && (
                            <p className="text-xs text-muted">{lt.description}</p>
                          )}
                          <p className="text-xs text-muted">
                            {deptName ? `Department: ${deptName} · ` : ""}
                            Default: {lt.max_days_per_year} days/year
                            {lt.requires_approval ? " · Requires approval" : " · Auto-approved"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleToggleType(lt)}>
                            {lt.is_active ? "Disable" : "Enable"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditType(lt)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteType(lt.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Rank Allocations */}
                      {typeAllocs.length > 0 && (
                        <div className="mt-2 ml-4">
                          <span className="text-xs font-medium text-muted">Rank allocations:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {typeAllocs.map((alloc) => (
                              <span
                                key={alloc.id}
                                className="inline-flex items-center gap-1 rounded bg-surface px-2 py-1 text-xs text-foreground"
                              >
                                {alloc.rank_id ? getRankName(alloc.rank_id) : (alloc.role ? <span className="capitalize">{alloc.role}</span> : "Default")}
                                {lt.system_type === "pto"
                                  ? `: ${alloc.hours_worked}h worked = ${alloc.hours_earned}h PTO`
                                  : `: ${alloc.days_per_year} days`}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAlloc(alloc.id)}
                                  className="ml-1 text-muted hover:text-destructive"
                                  aria-label="Remove allocation"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  No leave types configured for the selected system.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Type Modal */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title={editType ? "Edit Leave Type" : "Add Leave Type"}
      >
        <form onSubmit={handleSaveType} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <FormInput
            label="Leave Name"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="e.g. Annual Leave, Sick Leave"
            required
          />
          <FormInput
            label="Description (optional)"
            value={typeDesc}
            onChange={(e) => setTypeDesc(e.target.value)}
            placeholder="Brief description of this leave type"
          />
          <FormSelect
            label="Leave System Type"
            value={typeSystem}
            onChange={(e) => setTypeSystem(e.target.value)}
            options={LEAVE_SYSTEM_OPTIONS}
          />
          <FormSelect
            label="Department"
            value={typeDept}
            onChange={(e) => handleDeptChange(e.target.value)}
            options={deptOptions}
          />
          <FormInput
            label="Default Max Days Per Year"
            type="number"
            value={typeMaxDays}
            onChange={(e) => setTypeMaxDays(e.target.value)}
            placeholder="e.g. 20"
            min="0"
            max="365"
            step="0.5"
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires-approval"
              checked={typeRequiresApproval}
              onChange={(e) => setTypeRequiresApproval(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="requires-approval" className="text-sm text-foreground">
              Requires manager approval
            </label>
          </div>

          {/* Rank-based Allocations */}
          {typeDept && deptRanks.length > 0 && (
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Allocation by Staff Rank
                </h3>
                <p className="text-xs text-muted">
                  {typeSystem === "pto"
                    ? "Specify how many hours worked earn PTO hours for each rank."
                    : "Specify fixed days per year for each rank."}
                </p>
              </div>
              <div className="divide-y divide-border">
                {deptRanks.map((rank) => {
                  const val = rankAllocs[rank.id] || { days_per_year: "", hours_worked: "", hours_earned: "" };
                  return (
                    <div key={rank.id} className="px-3 py-2.5">
                      <p className="mb-1.5 text-sm font-medium text-foreground">{rank.name}</p>
                      {typeSystem === "pto" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Hours worked"
                            value={val.hours_worked}
                            onChange={(e) =>
                              setRankAllocs((prev) => ({
                                ...prev,
                                [rank.id]: { ...prev[rank.id], hours_worked: e.target.value },
                              }))
                            }
                            className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted"
                          />
                          <span className="text-xs text-muted">=</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="PTO hours"
                            value={val.hours_earned}
                            onChange={(e) =>
                              setRankAllocs((prev) => ({
                                ...prev,
                                [rank.id]: { ...prev[rank.id], hours_earned: e.target.value },
                              }))
                            }
                            className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted"
                          />
                          <span className="text-xs text-muted">PTO hours</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="365"
                            step="0.5"
                            placeholder="Days per year"
                            value={val.days_per_year}
                            onChange={(e) =>
                              setRankAllocs((prev) => ({
                                ...prev,
                                [rank.id]: { ...prev[rank.id], days_per_year: e.target.value },
                              }))
                            }
                            className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted"
                          />
                          <span className="text-xs text-muted">days per year</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {typeDept && deptRanks.length === 0 && (
            <p className="text-xs text-muted">
              No ranks configured for this department. Add ranks in the Departments page first.
            </p>
          )}

          {typeError && <p className="text-sm text-destructive">{typeError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowTypeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={typeSaving}>
              {typeSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainContent>
  );
}
