"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import Skeleton from "@/components/ui/Skeleton";
import { Department } from "@/types/department";
import { Shift } from "@/types/shift";
import { StaffingCategory, Rank } from "@/types/department-config";

type DeptTab = "shifts" | "categories" | "ranks";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeptTab>("categories");

  // Per-department data
  const [shifts, setShifts] = useState<Record<string, Shift[]>>({});
  const [categories, setCategories] = useState<Record<string, StaffingCategory[]>>({});
  const [ranks, setRanks] = useState<Record<string, Rank[]>>({});
  const [loadingSub, setLoadingSub] = useState(false);

  // Department form
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState("");

  // Shift form
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [shiftKey, setShiftKey] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [shiftBreak, setShiftBreak] = useState("0");
  const [shiftMinHours, setShiftMinHours] = useState("0");
  const [shiftMaxHours, setShiftMaxHours] = useState("40");
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState("");

  // Category form
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<StaffingCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");

  // Rank form
  const [showRankModal, setShowRankModal] = useState(false);
  const [editRank, setEditRank] = useState<Rank | null>(null);
  const [rankName, setRankName] = useState("");
  const [rankLevel, setRankLevel] = useState("0");
  const [rankDesc, setRankDesc] = useState("");
  const [rankSaving, setRankSaving] = useState(false);
  const [rankError, setRankError] = useState("");

  // Confirm delete
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<string | null>(null);

  async function fetchAllSubData(deptId: string) {
    setLoadingSub(true);
    const [shiftsRes, catsRes, ranksRes] = await Promise.all([
      fetch(`/api/shifts?department_id=${deptId}`).then((r) => r.json()),
      fetch(`/api/staffing-categories?department_id=${deptId}`).then((r) => r.json()),
      fetch(`/api/ranks?department_id=${deptId}`).then((r) => r.json()),
    ]);
    if (shiftsRes.data) setShifts((p) => ({ ...p, [deptId]: shiftsRes.data }));
    if (catsRes.data) setCategories((p) => ({ ...p, [deptId]: catsRes.data }));
    if (ranksRes.data) setRanks((p) => ({ ...p, [deptId]: ranksRes.data }));
    setLoadingSub(false);
  }

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    const json = await res.json();
    if (json.data) {
      setDepartments(json.data);
      if (json.data.length > 0 && !selectedDept) {
        const firstId = json.data[0].id;
        setSelectedDept(firstId);
        fetchAllSubData(firstId);
      }
    }
    setLoading(false);
  }, [selectedDept]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  function selectDept(deptId: string) {
    setSelectedDept(deptId);
    setActiveTab("categories");
    if (!categories[deptId] && !shifts[deptId] && !ranks[deptId]) {
      fetchAllSubData(deptId);
    }
  }

  // ---------- Department CRUD ----------
  function openAddDept() {
    setEditDept(null);
    setDeptName("");
    setDeptDesc("");
    setDeptError("");
    setShowDeptModal(true);
  }

  function openEditDept(dept: Department) {
    setEditDept(dept);
    setDeptName(dept.name);
    setDeptDesc(dept.description || "");
    setDeptError("");
    setShowDeptModal(true);
  }

  async function handleSaveDept(e: React.FormEvent) {
    e.preventDefault();
    setDeptSaving(true);
    setDeptError("");
    const url = editDept ? `/api/departments/${editDept.id}` : "/api/departments";
    const method = editDept ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptName, description: deptDesc || null }),
    });
    if (!res.ok) {
      const body = await res.json();
      setDeptError(body.error || "Failed to save department");
      setDeptSaving(false);
      return;
    }
    setShowDeptModal(false);
    setDeptSaving(false);
    await fetchDepartments();
  }

  async function handleDeleteDept(id: string) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDeleteDept(null);
      if (selectedDept === id) setSelectedDept(null);
      await fetchDepartments();
    }
  }

  // ---------- Shift CRUD ----------
  function openAddShift() {
    if (!selectedDept) return;
    setEditShift(null);
    setShiftName("");
    setShiftKey("");
    setShiftStart("");
    setShiftEnd("");
    setShiftBreak("0");
    setShiftMinHours("0");
    setShiftMaxHours("40");
    setShiftError("");
    setShowShiftModal(true);
  }

  function openEditShift(shift: Shift) {
    setEditShift(shift);
    setShiftName(shift.name);
    setShiftKey(shift.short_key);
    setShiftStart(shift.start_time.slice(0, 5));
    setShiftEnd(shift.end_time.slice(0, 5));
    setShiftBreak(String(shift.break_minutes));
    setShiftMinHours(String(shift.min_hours_per_week));
    setShiftMaxHours(String(shift.max_hours_per_week));
    setShiftError("");
    setShowShiftModal(true);
  }

  async function handleSaveShift(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDept) return;
    setShiftSaving(true);
    setShiftError("");
    const url = editShift ? `/api/shifts/${editShift.id}` : "/api/shifts";
    const method = editShift ? "PUT" : "POST";
    const body: Record<string, unknown> = {
      name: shiftName,
      short_key: shiftKey,
      start_time: shiftStart,
      end_time: shiftEnd,
      break_minutes: parseInt(shiftBreak, 10) || 0,
      min_hours_per_week: parseFloat(shiftMinHours) || 0,
      max_hours_per_week: parseFloat(shiftMaxHours) || 40,
    };
    if (!editShift) body.department_id = selectedDept;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setShiftError(b.error || "Failed to save shift");
      setShiftSaving(false);
      return;
    }
    setShowShiftModal(false);
    setShiftSaving(false);
    const r = await fetch(`/api/shifts?department_id=${selectedDept}`);
    const j = await r.json();
    if (j.data) setShifts((p) => ({ ...p, [selectedDept]: j.data }));
  }

  async function handleDeleteShift(shift: Shift) {
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    if (res.ok && selectedDept) {
      const r = await fetch(`/api/shifts?department_id=${selectedDept}`);
      const j = await r.json();
      if (j.data) setShifts((p) => ({ ...p, [selectedDept]: j.data }));
    }
  }

  // ---------- Category CRUD ----------
  function openAddCat() {
    if (!selectedDept) return;
    setEditCat(null);
    setCatName("");
    setCatDesc("");
    setCatError("");
    setShowCatModal(true);
  }

  function openEditCat(cat: StaffingCategory) {
    setEditCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatError("");
    setShowCatModal(true);
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDept) return;
    setCatSaving(true);
    setCatError("");
    const url = editCat ? `/api/staffing-categories/${editCat.id}` : "/api/staffing-categories";
    const method = editCat ? "PUT" : "POST";
    const body: Record<string, unknown> = { name: catName, description: catDesc || null };
    if (!editCat) body.department_id = selectedDept;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setCatError(b.error || "Failed to save category");
      setCatSaving(false);
      return;
    }
    setShowCatModal(false);
    setCatSaving(false);
    const r = await fetch(`/api/staffing-categories?department_id=${selectedDept}`);
    const j = await r.json();
    if (j.data) setCategories((p) => ({ ...p, [selectedDept]: j.data }));
  }

  async function handleDeleteCat(cat: StaffingCategory) {
    const res = await fetch(`/api/staffing-categories/${cat.id}`, { method: "DELETE" });
    if (res.ok && selectedDept) {
      const r = await fetch(`/api/staffing-categories?department_id=${selectedDept}`);
      const j = await r.json();
      if (j.data) setCategories((p) => ({ ...p, [selectedDept]: j.data }));
    }
  }

  // ---------- Rank CRUD ----------
  function openAddRank() {
    if (!selectedDept) return;
    setEditRank(null);
    setRankName("");
    setRankLevel("0");
    setRankDesc("");
    setRankError("");
    setShowRankModal(true);
  }

  function openEditRank(rank: Rank) {
    setEditRank(rank);
    setRankName(rank.name);
    setRankLevel(String(rank.level));
    setRankDesc(rank.description || "");
    setRankError("");
    setShowRankModal(true);
  }

  async function handleSaveRank(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDept) return;
    setRankSaving(true);
    setRankError("");
    const url = editRank ? `/api/ranks/${editRank.id}` : "/api/ranks";
    const method = editRank ? "PUT" : "POST";
    const body: Record<string, unknown> = { name: rankName, level: parseInt(rankLevel, 10), description: rankDesc || null };
    if (!editRank) body.department_id = selectedDept;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setRankError(b.error || "Failed to save rank");
      setRankSaving(false);
      return;
    }
    setShowRankModal(false);
    setRankSaving(false);
    const r = await fetch(`/api/ranks?department_id=${selectedDept}`);
    const j = await r.json();
    if (j.data) setRanks((p) => ({ ...p, [selectedDept]: j.data }));
  }

  async function handleDeleteRank(rank: Rank) {
    const res = await fetch(`/api/ranks/${rank.id}`, { method: "DELETE" });
    if (res.ok && selectedDept) {
      const r = await fetch(`/api/ranks?department_id=${selectedDept}`);
      const j = await r.json();
      if (j.data) setRanks((p) => ({ ...p, [selectedDept]: j.data }));
    }
  }

  // ---------- Tab definitions ----------
  const tabs: { key: DeptTab; label: string }[] = [
    { key: "categories", label: "Staffing Categories" },
    { key: "ranks", label: "Ranks" },
    { key: "shifts", label: "Shifts" },
  ];

  const activeDept = departments.find((d) => d.id === selectedDept);

  function renderTabContent() {
    if (!selectedDept) return null;

    if (loadingSub) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      );
    }

    if (activeTab === "categories") {
      const items = categories[selectedDept] || [];
      return (
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Staffing Categories</h3>
              <p className="text-xs text-muted">Define staff types for this department (e.g. Nurses, Doctors, Technicians)</p>
            </div>
            <Button size="sm" onClick={openAddCat}>Add Category</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Description</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 text-muted">{c.description || "\u2014"}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditCat(c)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteCat(c)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted">No staffing categories configured for this department.</p>
              <p className="mt-1 text-xs text-muted">Add categories like Nurses, Doctors, or Technicians to organize staff.</p>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "ranks") {
      const items = ranks[selectedDept] || [];
      return (
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ranks</h3>
              <p className="text-xs text-muted">Define rank hierarchy for this department (e.g. Staff Nurse, Senior Staff Nurse)</p>
            </div>
            <Button size="sm" onClick={openAddRank}>Add Rank</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-muted">Level</th>
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Description</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-foreground">{r.level}</td>
                    <td className="py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="py-2.5 text-muted">{r.description || "\u2014"}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditRank(r)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRank(r)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted">No ranks configured for this department.</p>
              <p className="mt-1 text-xs text-muted">Add ranks like Staff Nurse, Senior Staff Nurse, or Nursing Officer.</p>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "shifts") {
      const items = shifts[selectedDept] || [];
      return (
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Shifts</h3>
              <p className="text-xs text-muted">Define work shifts for this department</p>
            </div>
            <Button size="sm" onClick={openAddShift}>Add Shift</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Key</th>
                  <th className="pb-2 font-medium text-muted">Time</th>
                  <th className="pb-2 font-medium text-muted">Break</th>
                  <th className="pb-2 font-medium text-muted">Hours/Week</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="py-2.5 text-foreground">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono font-medium">{s.short_key}</span>
                    </td>
                    <td className="py-2.5 text-foreground">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                    <td className="py-2.5 text-foreground">{s.break_minutes} min</td>
                    <td className="py-2.5 text-foreground">{s.min_hours_per_week} - {s.max_hours_per_week}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditShift(s)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteShift(s)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted">No shifts configured for this department.</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <MainContent
      title="Departments"
      description="Manage departments and configure staffing categories, ranks, and shifts for each."
      actions={<Button size="sm" onClick={openAddDept}>Add Department</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Department list sidebar */}
        <div className="space-y-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Departments</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : departments.length > 0 ? (
            departments.map((dept) => (
              <div key={dept.id} className="group relative">
                <button
                  type="button"
                  onClick={() => selectDept(dept.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedDept === dept.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-surface"
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedDept === dept.id ? "text-primary" : "text-foreground"}`}>
                    {dept.name}
                  </p>
                  {dept.description && (
                    <p className="mt-0.5 text-xs text-muted line-clamp-1">{dept.description}</p>
                  )}
                  <div className="mt-1 flex gap-3 text-xs text-muted">
                    <span>{(categories[dept.id] || []).length} categories</span>
                    <span>{(ranks[dept.id] || []).length} ranks</span>
                    <span>{(shifts[dept.id] || []).length} shifts</span>
                  </div>
                </button>
                <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEditDept(dept); }}
                    className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteDept(dept.id); }}
                    className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-destructive/10 hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted">No departments yet.</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={openAddDept}>
                Create First Department
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border border-border">
          {selectedDept && activeDept ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">{activeDept.name}</h2>
                {activeDept.description && (
                  <p className="text-xs text-muted">{activeDept.description}</p>
                )}
              </div>
              <div className="flex border-b border-border">
                {tabs.map((t) => (
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
                    <span className="ml-1.5 text-xs">
                      {t.key === "categories" && `(${(categories[selectedDept] || []).length})`}
                      {t.key === "ranks" && `(${(ranks[selectedDept] || []).length})`}
                      {t.key === "shifts" && `(${(shifts[selectedDept] || []).length})`}
                    </span>
                  </button>
                ))}
              </div>
              {renderTabContent()}
            </>
          ) : (
            <div className="flex items-center justify-center px-4 py-16">
              <p className="text-sm text-muted">
                {loading ? "Loading..." : departments.length > 0 ? "Select a department to configure." : "Create a department to get started."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Department Modal */}
      <Modal isOpen={showDeptModal} onClose={() => setShowDeptModal(false)} title={editDept ? "Edit Department" : "Add Department"}>
        <form onSubmit={handleSaveDept} className="space-y-4">
          <FormInput label="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
          <FormInput label="Description" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Optional description" />
          {deptError && <p className="text-sm text-destructive">{deptError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button type="submit" disabled={deptSaving}>{deptSaving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Department */}
      <Modal isOpen={confirmDeleteDept !== null} onClose={() => setConfirmDeleteDept(null)} title="Delete Department">
        <p className="text-sm text-foreground">
          This will permanently delete this department and all its shifts, staffing categories, and ranks. This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteDept(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => confirmDeleteDept && handleDeleteDept(confirmDeleteDept)}>Delete</Button>
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title={editShift ? "Edit Shift" : "Add Shift"}>
        <form onSubmit={handleSaveShift} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Shift Name" value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="e.g. Morning" required />
            <FormInput label="Key" value={shiftKey} onChange={(e) => setShiftKey(e.target.value)} placeholder="e.g. M, A, N, X" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Time" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required />
            <FormInput label="End Time" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required />
          </div>
          <FormInput label="Break Duration (minutes)" type="number" value={shiftBreak} onChange={(e) => setShiftBreak(e.target.value)} placeholder="e.g. 30" />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Min Hours/Week" type="number" value={shiftMinHours} onChange={(e) => setShiftMinHours(e.target.value)} placeholder="e.g. 20" />
            <FormInput label="Max Hours/Week" type="number" value={shiftMaxHours} onChange={(e) => setShiftMaxHours(e.target.value)} placeholder="e.g. 40" />
          </div>
          {shiftError && <p className="text-sm text-destructive">{shiftError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowShiftModal(false)}>Cancel</Button>
            <Button type="submit" disabled={shiftSaving}>{shiftSaving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editCat ? "Edit Staffing Category" : "Add Staffing Category"}>
        <form onSubmit={handleSaveCat} className="space-y-4">
          <FormInput label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Nurses, Doctors, Technicians" required />
          <FormInput label="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Optional description" />
          {catError && <p className="text-sm text-destructive">{catError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCatModal(false)}>Cancel</Button>
            <Button type="submit" disabled={catSaving}>{catSaving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Rank Modal */}
      <Modal isOpen={showRankModal} onClose={() => setShowRankModal(false)} title={editRank ? "Edit Rank" : "Add Rank"}>
        <form onSubmit={handleSaveRank} className="space-y-4">
          <FormInput label="Rank Name" value={rankName} onChange={(e) => setRankName(e.target.value)} placeholder="e.g. Staff Nurse, Senior Staff Nurse" required />
          <FormInput label="Level" type="number" value={rankLevel} onChange={(e) => setRankLevel(e.target.value)} placeholder="Numeric level for ordering" />
          <FormInput label="Description" value={rankDesc} onChange={(e) => setRankDesc(e.target.value)} placeholder="Optional description" />
          {rankError && <p className="text-sm text-destructive">{rankError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowRankModal(false)}>Cancel</Button>
            <Button type="submit" disabled={rankSaving}>{rankSaving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </MainContent>
  );
}
