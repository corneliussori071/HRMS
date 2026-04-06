"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import Skeleton from "@/components/ui/Skeleton";
import { Department } from "@/types/department";
import { Shift } from "@/types/shift";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [loadingShifts, setLoadingShifts] = useState<string | null>(null);

  // Department form state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState("");

  // Shift form state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftDeptId, setShiftDeptId] = useState("");
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState("");

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    const json = await res.json();
    if (json.data) setDepartments(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function fetchShiftsForDept(deptId: string) {
    setLoadingShifts(deptId);
    const res = await fetch(`/api/shifts?department_id=${deptId}`);
    const json = await res.json();
    if (json.data) {
      setShifts((prev) => ({ ...prev, [deptId]: json.data }));
    }
    setLoadingShifts(null);
  }

  function toggleExpand(deptId: string) {
    if (expandedDept === deptId) {
      setExpandedDept(null);
    } else {
      setExpandedDept(deptId);
      if (!shifts[deptId]) {
        fetchShiftsForDept(deptId);
      }
    }
  }

  // Department CRUD
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
      await fetchDepartments();
      if (expandedDept === id) setExpandedDept(null);
    }
  }

  // Shift CRUD
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

    const body: Record<string, unknown> = {
      name: shiftName,
      start_time: shiftStart,
      end_time: shiftEnd,
    };
    if (!editShift) body.department_id = shiftDeptId;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const resBody = await res.json();
      setShiftError(resBody.error || "Failed to save shift");
      setShiftSaving(false);
      return;
    }

    setShowShiftModal(false);
    setShiftSaving(false);
    await fetchShiftsForDept(shiftDeptId);
  }

  async function handleDeleteShift(shift: Shift) {
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchShiftsForDept(shift.department_id);
    }
  }

  return (
    <MainContent
      title="Departments"
      description="Manage departments and their work shifts."
      actions={
        <Button size="sm" onClick={openAddDept}>
          Add Department
        </Button>
      }
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
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => toggleExpand(dept.id)}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {dept.name}
                  </p>
                  {dept.description && (
                    <p className="text-xs text-muted">{dept.description}</p>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEditDept(dept)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteDept(dept.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              {expandedDept === dept.id && (
                <div className="border-t border-border bg-surface px-4 py-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Shifts</h3>
                    <Button size="sm" variant="secondary" onClick={() => openAddShift(dept.id)}>
                      Add Shift
                    </Button>
                  </div>

                  {loadingShifts === dept.id ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (shifts[dept.id] || []).length > 0 ? (
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
                        {(shifts[dept.id] || []).map((shift) => (
                          <tr key={shift.id} className="border-b border-border last:border-0">
                            <td className="py-2 text-foreground">{shift.name}</td>
                            <td className="py-2 text-foreground">{shift.start_time.slice(0, 5)}</td>
                            <td className="py-2 text-foreground">{shift.end_time.slice(0, 5)}</td>
                            <td className="py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${shift.is_active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>
                                {shift.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditShift(shift)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteShift(shift)}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted">No shifts configured for this department.</p>
                  )}
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
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editDept ? "Edit Department" : "Add Department"}
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <FormInput
            label="Department Name"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            required
          />
          <FormInput
            label="Description"
            value={deptDesc}
            onChange={(e) => setDeptDesc(e.target.value)}
            placeholder="Optional description"
          />
          {deptError && <p className="text-sm text-destructive">{deptError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={deptSaving}>
              {deptSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shift Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title={editShift ? "Edit Shift" : "Add Shift"}
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          <FormInput
            label="Shift Name"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            placeholder="e.g. Morning, Afternoon, Night"
            required
          />
          <FormInput
            label="Start Time"
            type="time"
            value={shiftStart}
            onChange={(e) => setShiftStart(e.target.value)}
            required
          />
          <FormInput
            label="End Time"
            type="time"
            value={shiftEnd}
            onChange={(e) => setShiftEnd(e.target.value)}
            required
          />
          {shiftError && <p className="text-sm text-destructive">{shiftError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowShiftModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={shiftSaving}>
              {shiftSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainContent>
  );
}
