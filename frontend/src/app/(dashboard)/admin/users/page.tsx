"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, UserRole } from "@/types/auth";
import { Department } from "@/types/department";

interface ProfileWithDepartment extends UserProfile {
  departments?: { name: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<ProfileWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("staff");
  const [editUser, setEditUser] = useState<ProfileWithDepartment | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) setCurrentUserRole(profile.role);

    const [usersResult, deptResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, role, department_id, phone, avatar_url, created_at, updated_at, departments(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("departments")
        .select("id, name, description, created_at")
        .order("name"),
    ]);

    if (usersResult.data) setUsers(usersResult.data as unknown as ProfileWithDepartment[]);
    if (deptResult.data) setDepartments(deptResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openEdit(user: ProfileWithDepartment) {
    setEditUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department_id || "");
    setError("");
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true);
    setError("");

    const response = await fetch(`/api/users/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: editRole,
        department_id: editDepartment || null,
        full_name: editUser.full_name,
      }),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Failed to update user");
      setSaving(false);
      return;
    }

    setEditUser(null);
    setSaving(false);
    await fetchData();
  }

  const isAdmin = currentUserRole === "admin" || currentUserRole === "hr";

  const roleOptions = [
    { value: "staff", label: "Staff" },
    { value: "manager", label: "Manager" },
    { value: "hr", label: "HR" },
    { value: "admin", label: "Admin" },
  ];

  const departmentOptions = [
    { value: "", label: "No department" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <MainContent
      title="Users"
      description="Manage employee accounts, roles, and department assignments."
    >
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Name</th>
              <th className="px-4 py-3 font-medium text-muted">Email</th>
              <th className="px-4 py-3 font-medium text-muted">Role</th>
              <th className="px-4 py-3 font-medium text-muted">Department</th>
              <th className="px-4 py-3 font-medium text-muted">Joined</th>
              {isAdmin && (
                <th className="px-4 py-3 font-medium text-muted">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                  {isAdmin && <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>}
                </tr>
              ))
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                  <td className="px-4 py-3 text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium capitalize text-foreground">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {u.departments?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={editUser !== null}
        onClose={() => setEditUser(null)}
        title={`Edit User: ${editUser?.full_name || ""}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Email</p>
            <p className="text-sm font-medium text-foreground">{editUser?.email}</p>
          </div>
          <FormSelect
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={roleOptions}
          />
          <FormSelect
            label="Department"
            value={editDepartment}
            onChange={(e) => setEditDepartment(e.target.value)}
            options={departmentOptions}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </MainContent>
  );
}
