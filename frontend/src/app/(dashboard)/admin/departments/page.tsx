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
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeptTab>("shifts");

  // Per-department data
  const [shifts, setShifts] = useState<Record<string, Shift[]>>({});
  const [categories, setCategories] = useState<Record<string, StaffingCategory[]>>({});
  const [ranks, setRanks] = useState<Record<string, Rank[]>>({});
  const [loadingSub, setLoadingSub] = useState<string | null>(null);

  // Department form
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState("");

  // Shift form
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftDeptId, setShiftDeptId] = useState("");
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState("");

  // Category form
  const [showCatModal, setShowCatModal] = useState(false);
  const [catDeptId, setCatDeptId] = useState("");
  const [editCat, setEditCat] = useState<StaffingCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");

  // Rank form
  const [showRankModal, setShowRankModal] = useState(false);
  const [rankDeptId, setRankDeptId] = useState("");
  const [editRank, setEditRank] = useState<Rank | null>(null);
  const [rankName, setRankName] = useState("");
  const [rankLevel, setRankLevel] = useState("0");
  const [rankDesc, setRankDesc] = useState("");
  const [rankSaving, setRankSaving] = useState(false);
  const [rankError, setRankError] = useState("");

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    const json = await res.json();
    if (json.data) setDepartments(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function fetchSubData(deptId: string, tab: DeptTab) {
    setLoadingSub(deptId);
    if (tab === "shifts" && !shifts[deptId]) {
      const res = await fetch(`/api/shifts?department_id=${deptId}`);
      const json = await res.json();
      if (json.data) setShifts((p) => ({ ...p, [deptId]: json.data }));
    }
    if (tab === "categories" && !categories[deptId]) {
      const res = await fetch(`/api/staffing-categories?department_id=${deptId}`);
      const json = await res.json();
      if (json.data) setCategories((p) => ({ ...p, [deptId]: json.data }));
    }
    if (tab === "ranks" && !ranks[deptId]) {
      const res = await fetch(`/api/ranks?department_id=${deptId}`);
      const json = await res.json();
      if (json.data) setRanks((p) => ({ ...p, [deptId]: json.data }));
    }
    setLoadingSub(null);
  }

  function toggleExpand(deptId: string) {
    if (expandedDept === deptId) {
      setExpandedDept(null);
    } else {
      setExpandedDept(deptId);
      setActiveTab("shifts");
      fetchSubData(deptId, "shifts");
    }
  }

  function switchTab(tab: DeptTab) {
    setActiveTab(tab);
    if (expandedDept) fetchSubData(expandedDept, tab);
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
    if (!confirm("Delete this department and all its shifts, categories, and ranks?")) return;
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchDepartments();
      if (expandedDept === id) setExpandedDept(null);
    }
  }

  // ---------- Shift CRUD ----------
  function openAddShift(deptId: string) {
    setEditShift(null);
    setShiftDeptId(deptId);
    setShiftName("");
    setShiftStart("");
    setShiftEnd("");
    setShiftError("");
    setShowShiftModal(true);
  }

  function openEditShift(shift: Shift) {
    setEditShift(shift);
    setShiftDeptId(shift.department_id);
    setShiftName(shift.name);
    setShiftStart(shift.start_time.slice(0, 5));
    setShiftEnd(shift.end_time.slice(0, 5));
    setShiftError("");
    setShowShiftModal(true);
  }

  async function handleSaveShift(e: React.FormEvent) {
    e.preventDefault();
    setShiftSaving(true);
    setShiftError("");
    const url = editShift ? `/api/shifts/${editShift.id}` : "/api/shifts";
    const method = editShift ? "PUT" : "POST";
    const body: Record<string, unknown> = { name: shiftName, start_time: shiftStart, end_time: shiftEnd };
    if (!editShift) body.department_id = shiftDeptId;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setShiftError(b.error || "Failed to save shift");
      setShiftSaving(false);
      return;
    }
    setShowShiftModal(false);
    setShiftSaving(false);
    const r = await fetch(`/api/shifts?department_id=${shiftDeptId}`);
    const j = await r.json();
    if (j.data) setShifts((p) => ({ ...p, [shiftDeptId]: j.data }));
  }

  async function handleDeleteShift(shift: Shift) {
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    if (res.ok) {
      const r = await fetch(`/api/shifts?department_id=${shift.department_id}`);
      const j = await r.json();
      if (j.data) setShifts((p) => ({ ...p, [shift.department_id]: j.data }));
    }
  }

  // ---------- Category CRUD ----------
  function openAddCat(deptId: string) {
    setEditCat(null);
    setCatDeptId(deptId);
    setCatName("");
    setCatDesc("");
    setCatError("");
    setShowCatModal(true);
  }

  function openEditCat(cat: StaffingCategory) {
    setEditCat(cat);
    setCatDeptId(cat.department_id);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatError("");
    setShowCatModal(true);
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault();
    setCatSaving(true);
    setCatError("");
    const url = editCat ? `/api/staffing-categories/${editCat.id}` : "/api/staffing-categories";
    const method = editCat ? "PUT" : "POST";
    const body: Record<string, unknown> = { name: catName, description: catDesc || null };
    if (!editCat) body.department_id = catDeptId;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setCatError(b.error || "Failed to save category");
      setCatSaving(false);
      return;
    }
    setShowCatModal(false);
    setCatSaving(false);
    const r = await fetch(`/api/staffing-categories?department_id=${catDeptId}`);
    const j = await r.json();
    if (j.data) setCategories((p) => ({ ...p, [catDeptId]: j.data }));
  }

  async function handleDeleteCat(cat: StaffingCategory) {
    const res = await fetch(`/api/staffing-categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      const r = await fetch(`/api/staffing-categories?department_id=${cat.department_id}`);
      const j = await r.json();
      if (j.data) setCategories((p) => ({ ...p, [cat.department_id]: j.data }));
    }
  }

  // ---------- Rank CRUD ----------
  function openAddRank(deptId: string) {
    setEditRank(null);
    setRankDeptId(deptId);
    setRankName("");
    setRankLevel("0");
    setRankDesc("");
    setRankError("");
    setShowRankModal(true);
  }

  function openEditRank(rank: Rank) {
    setEditRank(rank);
    setRankDeptId(rank.department_id);
    setRankName(rank.name);
    setRankLevel(String(rank.level));
    setRankDesc(rank.description || "");
    setRankError("");
    setShowRankModal(true);
  }

  async function handleSaveRank(e: React.FormEvent) {
    e.preventDefault();
    setRankSaving(true);
    setRankError("");
    const url = editRank ? `/api/ranks/${editRank.id}` : "/api/ranks";
    const method = editRank ? "PUT" : "POST";
    const body: Record<string, unknown> = { name: rankName, level: parseInt(rankLevel, 10), description: rankDesc || null };
    if (!editRank) body.department_id = rankDeptId;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json();
      setRankError(b.error || "Failed to save rank");
      setRankSaving(false);
      return;
    }
    setShowRankModal(false);
    setRankSaving(false);
    const r = await fetch(`/api/ranks?department_id=${rankDeptId}`);
    const j = await r.json();
    if (j.data) setRanks((p) => ({ ...p, [rankDeptId]: j.data }));
  }

  async function handleDeleteRank(rank: Rank) {
    const res = await fetch(`/api/ranks/${rank.id}`, { method: "DELETE" });
    if (res.ok) {
      const r = await fetch(`/api/ranks?department_id=${rank.department_id}`);
      const j = await r.json();
      if (j.data) setRanks((p) => ({ ...p, [rank.department_id]: j.data }));
    }
  }

  // ---------- Tab content rendering ----------
  const tabs: { key: DeptTab; label: string }[] = [
    { key: "shifts", label: "Shifts" },
    { key: "categories", label: "Staffing Categories" },
    { key: "ranks", label: "Ranks" },
  ];

  function renderTabContent(deptId: string) {
    if (loadingSub === deptId) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    if (activeTab === "shifts") {
      const items = shifts[deptId] || [];
      return (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Shifts</h3>
            <Button size="sm" variant="secondary" onClick={() => openAddShift(deptId)}>Add Shift</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Start</th>
                  <th className="pb-2 font-medium text-muted">End</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{s.name}</td>
                    <td className="py-2 text-foreground">{s.start_time.slice(0, 5)}</td>
                    <td className="py-2 text-foreground">{s.end_time.slice(0, 5)}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditShift(s)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteShift(s)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">No shifts configured.</p>
          )}
        </>
      );
    }

    if (activeTab === "categories") {
      const items = categories[deptId] || [];
      return (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Staffing Categories</h3>
            <Button size="sm" variant="secondary" onClick={() => openAddCat(deptId)}>Add Category</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Description</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{c.name}</td>
                    <td className="py-2 text-muted">{c.description || "\u2014"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditCat(c)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteCat(c)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">No staffing categories configured.</p>
          )}
        </>
      );
    }

    if (activeTab === "ranks") {
      const items = ranks[deptId] || [];
      return (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Ranks</h3>
            <Button size="sm" variant="secondary" onClick={() => openAddRank(deptId)}>Add Rank</Button>
          </div>
          {items.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 font-medium text-muted">Name</th>
                  <th className="pb-2 font-medium text-muted">Level</th>
                  <th className="pb-2 font-medium text-muted">Description</th>
                  <th className="pb-2 font-medium text-muted">Status</th>
                  <th className="pb-2 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{r.name}</td>
                    <td className="py-2 text-foreground">{r.level}</td>
                    <td className="py-2 text-muted">{r.description || "\u2014"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditRank(r)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRank(r)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">No ranks configured.</p>
          )}
        </>
      );
    }

    return null;
  }

  return (
    <MainContent
      title="Departments"
      description="Manage departments, shifts, staffing categories, and ranks."
      actions={<Button size="sm" onClick={openAddDept}>Add Department</Button>}
    >
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-72" />
            </div>
          ))
        ) : departments.length > 0 ? (
          departments.map((dept) => (
            <div key={dept.id} className="rounded-lg border border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <button type="button" className="flex-1 text-left" onClick={() => toggleExpand(dept.id)}>
                  <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                  {dept.description && <p className="text-xs text-muted">{dept.description}</p>}
                </button>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEditDept(dept)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteDept(dept.id)}>Delete</Button>
                </div>
              </div>
              {expandedDept === dept.id && (
                <div className="border-t border-border bg-surface px-4 py-3">
                  <div className="mb-4 flex gap-1 border-b border-border">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => switchTab(t.key)}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          activeTab === t.key
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {renderTabContent(dept.id)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted">
            No departments created yet.
          </div>
        )}
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

      {/* Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title={editShift ? "Edit Shift" : "Add Shift"}>
        <form onSubmit={handleSaveShift} className="space-y-4">
          <FormInput label="Shift Name" value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="e.g. Morning, Afternoon, Night" required />
          <FormInput label="Start Time" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required />
          <FormInput label="End Time" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required />
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
