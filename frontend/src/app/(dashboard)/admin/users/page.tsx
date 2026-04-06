"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/auth";
import { Department } from "@/types/department";
import { Rank, StaffingCategory } from "@/types/department-config";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  phone: string | null;
  rank_id: string | null;
  staffing_category_id: string | null;
  date_of_employment: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  departments?: { id: string; name: string } | null;
  ranks?: { id: string; name: string } | null;
  staffing_categories?: { id: string; name: string } | null;
}

interface UserDetail extends UserRow {
  avatar_url: string | null;
  shift_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employment_type: string;
  pay_type: string;
  pay_rate: number;
  bank_name: string | null;
  bank_account_number: string | null;
  tax_id: string | null;
  shifts?: { id: string; name: string } | null;
}

type ModalView = "none" | "add" | "csv" | "edit" | "credentials" | "details";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

const PAY_TYPE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "hourly", label: "Hourly" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [categories, setCategories] = useState<StaffingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("staff");
  const [currentUserId, setCurrentUserId] = useState("");

  const [modalView, setModalView] = useState<ModalView>("none");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Action menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Add/Edit form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("staff");
  const [formDept, setFormDept] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRank, setFormRank] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmergencyName, setFormEmergencyName] = useState("");
  const [formEmergencyPhone, setFormEmergencyPhone] = useState("");
  const [formDoe, setFormDoe] = useState("");
  const [formEmploymentType, setFormEmploymentType] = useState("full_time");
  const [formPayType, setFormPayType] = useState("monthly");
  const [formPayRate, setFormPayRate] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  // Credentials form
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");

  // CSV
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvResults, setCsvResults] = useState<Array<{ email: string; success: boolean; error?: string }>>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  // Filtered ranks/categories by selected department
  const deptRanks = formDept ? ranks.filter((r) => r.department_id === formDept) : [];
  const deptCategories = formDept ? categories.filter((c) => c.department_id === formDept) : [];

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile) setCurrentUserRole(profile.role);

    const [usersRes, deptRes, ranksRes, catsRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, email, full_name, role, department_id, phone, rank_id, staffing_category_id, date_of_employment, status, created_at, updated_at, departments(id, name), ranks(id, name), staffing_categories(id, name)")
        .order("created_at", { ascending: false }),
      supabase.from("departments").select("id, name, description, created_at").order("name"),
      fetch("/api/ranks").then((r) => r.json()),
      fetch("/api/staffing-categories").then((r) => r.json()),
    ]);

    if (usersRes.data) setUsers(usersRes.data as unknown as UserRow[]);
    if (deptRes.data) setDepartments(deptRes.data);
    if (ranksRes.data) setRanks(ranksRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close action menu on outside click
  useEffect(() => {
    function handleClick() { setActionMenuId(null); }
    if (actionMenuId) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [actionMenuId]);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "hr";

  const deptOptions = [{ value: "", label: "No department" }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const rankOptions = [{ value: "", label: formDept ? "No rank" : "Select a department first" }, ...deptRanks.map((r) => ({ value: r.id, label: r.name }))];
  const catOptions = [{ value: "", label: formDept ? "No role" : "Select a department first" }, ...deptCategories.map((c) => ({ value: c.id, label: c.name }))];
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "terminated", label: "Terminated" },
  ];

  function resetForm() {
    setFormName(""); setFormEmail(""); setFormPassword(""); setFormRole("staff");
    setFormDept(""); setFormPhone(""); setFormRank(""); setFormCategory("");
    setFormDob(""); setFormGender(""); setFormAddress("");
    setFormEmergencyName(""); setFormEmergencyPhone("");
    setFormDoe(""); setFormEmploymentType("full_time");
    setFormPayType("monthly"); setFormPayRate("");
    setFormBankName(""); setFormBankAccount(""); setFormTaxId("");
    setFormStatus("active"); setError("");
  }

  function openAdd() {
    resetForm();
    setModalView("add");
  }

  function openEdit(user: UserRow) {
    setSelectedUser(user);
    setFormName(user.full_name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormDept(user.department_id || "");
    setFormPhone(user.phone || "");
    setFormRank(user.rank_id || "");
    setFormCategory(user.staffing_category_id || "");
    setFormDoe(user.date_of_employment || "");
    setFormStatus(user.status || "active");
    setError("");

    // Load full details for extended fields
    fetch(`/api/users/${user.id}`).then((r) => r.json()).then((res) => {
      if (res.data) {
        const d = res.data as UserDetail;
        setFormDob(d.date_of_birth || "");
        setFormGender(d.gender || "");
        setFormAddress(d.address || "");
        setFormEmergencyName(d.emergency_contact_name || "");
        setFormEmergencyPhone(d.emergency_contact_phone || "");
        setFormEmploymentType(d.employment_type || "full_time");
        setFormPayType(d.pay_type || "monthly");
        setFormPayRate(d.pay_rate ? String(d.pay_rate) : "");
        setFormBankName(d.bank_name || "");
        setFormBankAccount(d.bank_account_number || "");
        setFormTaxId(d.tax_id || "");
      }
    });
    setModalView("edit");
  }

  function openCredentials(user: UserRow) {
    setSelectedUser(user);
    setCredEmail(user.email);
    setCredPassword("");
    setError("");
    setModalView("credentials");
  }

  async function openDetails(user: UserRow) {
    setSelectedUser(user);
    setDetailLoading(true);
    setModalView("details");
    const res = await fetch(`/api/users/${user.id}`);
    const json = await res.json();
    if (json.data) setUserDetail(json.data as UserDetail);
    setDetailLoading(false);
  }

  function openCsv() {
    setCsvData([]);
    setCsvResults([]);
    setError("");
    setModalView("csv");
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      email: formEmail,
      password: formPassword,
      full_name: formName,
      role: formRole,
      department_id: formDept || null,
      phone: formPhone || null,
      rank_id: formRank || null,
      staffing_category_id: formCategory || null,
      date_of_birth: formDob || null,
      gender: formGender || null,
      address: formAddress || null,
      emergency_contact_name: formEmergencyName || null,
      emergency_contact_phone: formEmergencyPhone || null,
      date_of_employment: formDoe || null,
      employment_type: formEmploymentType,
      pay_type: formPayType,
      pay_rate: formPayRate ? parseFloat(formPayRate) : 0,
      bank_name: formBankName || null,
      bank_account_number: formBankAccount || null,
      tax_id: formTaxId || null,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create user");
      setSaving(false);
      return;
    }

    setModalView("none");
    setSaving(false);
    await fetchData();
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setError("");

    const payload = {
      full_name: formName,
      role: formRole,
      department_id: formDept || null,
      phone: formPhone || null,
      rank_id: formRank || null,
      staffing_category_id: formCategory || null,
      date_of_birth: formDob || null,
      gender: formGender || null,
      address: formAddress || null,
      emergency_contact_name: formEmergencyName || null,
      emergency_contact_phone: formEmergencyPhone || null,
      date_of_employment: formDoe || null,
      employment_type: formEmploymentType,
      pay_type: formPayType,
      pay_rate: formPayRate ? parseFloat(formPayRate) : 0,
      bank_name: formBankName || null,
      bank_account_number: formBankAccount || null,
      tax_id: formTaxId || null,
      status: formStatus,
    };

    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to update user");
      setSaving(false);
      return;
    }

    setModalView("none");
    setSaving(false);
    await fetchData();
  }

  async function handleUpdateCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setError("");

    const payload: Record<string, string> = {};
    if (credEmail !== selectedUser.email) payload.email = credEmail;
    if (credPassword) payload.password = credPassword;

    if (Object.keys(payload).length === 0) {
      setError("No changes to save");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/users/${selectedUser.id}/credentials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to update credentials");
      setSaving(false);
      return;
    }

    setModalView("none");
    setSaving(false);
    await fetchData();
  }

  async function handleSuspend(user: UserRow) {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchData();
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`Delete ${user.full_name}? This action cannot be undone.`)) return;
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    await fetchData();
  }

  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        if (row.full_name && row.email) rows.push(row);
      }

      setCsvData(rows);
      setCsvResults([]);
      setError(rows.length === 0 ? "No valid rows found. Ensure CSV has full_name and email columns." : "");
    };
    reader.readAsText(file);
  }

  async function handleCsvImport() {
    if (csvData.length === 0) return;
    setCsvImporting(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(csvData),
    });

    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      setCsvResults(json.data);
    } else {
      setError(json.error || "Import failed");
    }
    setCsvImporting(false);
    await fetchData();
  }

  const statusColors: Record<string, string> = {
    active: "bg-success/10 text-success",
    suspended: "bg-warning/10 text-warning",
    terminated: "bg-destructive/10 text-destructive",
  };

  // Form sections shared between add and edit
  function renderFormFields(isEdit: boolean) {
    return (
      <>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Personal Information</legend>
          <FormInput label="Full Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          {!isEdit && <FormInput label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />}
          {!isEdit && <FormInput label="Password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Min 8 characters" required />}
          <FormInput label="Phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          <FormInput label="Date of Birth" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
          <FormSelect label="Gender" value={formGender} onChange={(e) => setFormGender(e.target.value)} options={GENDER_OPTIONS} />
          <FormInput label="Address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          <FormInput label="Emergency Contact Name" value={formEmergencyName} onChange={(e) => setFormEmergencyName(e.target.value)} />
          <FormInput label="Emergency Contact Phone" value={formEmergencyPhone} onChange={(e) => setFormEmergencyPhone(e.target.value)} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Employment Information</legend>
          <FormSelect label="Department" value={formDept} onChange={(e) => { setFormDept(e.target.value); setFormRank(""); setFormCategory(""); }} options={deptOptions} />
          <FormSelect label="Role" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} options={catOptions} disabled={!formDept} />
          <FormSelect label="Rank" value={formRank} onChange={(e) => setFormRank(e.target.value)} options={rankOptions} disabled={!formDept} />
          <FormSelect label="System Role" value={formRole} onChange={(e) => setFormRole(e.target.value)} options={ROLE_OPTIONS} />
          <FormInput label="Date of Employment" type="date" value={formDoe} onChange={(e) => setFormDoe(e.target.value)} />
          <FormSelect label="Employment Type" value={formEmploymentType} onChange={(e) => setFormEmploymentType(e.target.value)} options={EMPLOYMENT_TYPE_OPTIONS} />
          {isEdit && <FormSelect label="Status" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} options={statusOptions} />}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Payment Information</legend>
          <FormSelect label="Pay Type" value={formPayType} onChange={(e) => setFormPayType(e.target.value)} options={PAY_TYPE_OPTIONS} />
          <FormInput label={formPayType === "hourly" ? "Pay Rate (per hour)" : "Pay Rate (monthly)"} type="number" value={formPayRate} onChange={(e) => setFormPayRate(e.target.value)} placeholder="0.00" />
          <FormInput label="Bank Name" value={formBankName} onChange={(e) => setFormBankName(e.target.value)} />
          <FormInput label="Bank Account Number" value={formBankAccount} onChange={(e) => setFormBankAccount(e.target.value)} />
          <FormInput label="Tax ID" value={formTaxId} onChange={(e) => setFormTaxId(e.target.value)} />
        </fieldset>
      </>
    );
  }

  return (
    <MainContent
      title="Users"
      description="Manage employee accounts, roles, and department assignments."
      actions={
        isAdmin ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={openCsv}>CSV Import</Button>
            <Button size="sm" onClick={openAdd}>Add User</Button>
          </div>
        ) : undefined
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Name</th>
              <th className="px-4 py-3 font-medium text-muted">Email</th>
              <th className="px-4 py-3 font-medium text-muted">System Role</th>
              <th className="px-4 py-3 font-medium text-muted">Department</th>
              <th className="px-4 py-3 font-medium text-muted">Date of Employment</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-muted">Actions</th>}
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
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                  {isAdmin && <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>}
                </tr>
              ))
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                  <td className="px-4 py-3 text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium capitalize text-foreground">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{u.departments?.name || "\u2014"}</td>
                  <td className="px-4 py-3 text-muted">{u.date_of_employment ? new Date(u.date_of_employment).toLocaleDateString() : "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[u.status] || ""}`}>{u.status || "active"}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === u.id ? null : u.id); }}
                        >
                          Actions
                        </Button>
                        {actionMenuId === u.id && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg">
                            <button type="button" className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface" onClick={() => { setActionMenuId(null); openDetails(u); }}>
                              View Details
                            </button>
                            <button type="button" className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface" onClick={() => { setActionMenuId(null); openEdit(u); }}>
                              Edit
                            </button>
                            <button type="button" className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface" onClick={() => { setActionMenuId(null); openCredentials(u); }}>
                              Update Credentials
                            </button>
                            {u.id !== currentUserId && (
                              <>
                                <button type="button" className="w-full px-4 py-2 text-left text-sm text-warning hover:bg-surface" onClick={() => { setActionMenuId(null); handleSuspend(u); }}>
                                  {u.status === "suspended" ? "Reactivate" : "Suspend"}
                                </button>
                                <button type="button" className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-surface" onClick={() => { setActionMenuId(null); handleDelete(u); }}>
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-sm text-muted">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={modalView === "add"} onClose={() => setModalView("none")} title="Add User">
        <form onSubmit={handleAddUser} className="max-h-[70vh] space-y-5 overflow-y-auto pr-2">
          {renderFormFields(false)}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalView("none")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={modalView === "edit"} onClose={() => setModalView("none")} title={`Edit: ${selectedUser?.full_name || ""}`}>
        <form onSubmit={handleEditUser} className="max-h-[70vh] space-y-5 overflow-y-auto pr-2">
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium text-foreground">{selectedUser?.email}</p>
          </div>
          {renderFormFields(true)}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalView("none")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal isOpen={modalView === "credentials"} onClose={() => setModalView("none")} title={`Update Credentials: ${selectedUser?.full_name || ""}`}>
        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <FormInput label="Email" type="email" value={credEmail} onChange={(e) => setCredEmail(e.target.value)} />
          <FormInput label="New Password" type="password" value={credPassword} onChange={(e) => setCredPassword(e.target.value)} placeholder="Leave blank to keep current password" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalView("none")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Updating..." : "Update Credentials"}</Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={modalView === "details"} onClose={() => { setModalView("none"); setUserDetail(null); }} title={`Details: ${selectedUser?.full_name || ""}`}>
        {detailLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : userDetail ? (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Personal Information</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Full Name</dt><dd className="text-foreground">{userDetail.full_name}</dd>
                <dt className="text-muted">Email</dt><dd className="text-foreground">{userDetail.email}</dd>
                <dt className="text-muted">Phone</dt><dd className="text-foreground">{userDetail.phone || "\u2014"}</dd>
                <dt className="text-muted">Date of Birth</dt><dd className="text-foreground">{userDetail.date_of_birth || "\u2014"}</dd>
                <dt className="text-muted">Gender</dt><dd className="text-foreground capitalize">{userDetail.gender || "\u2014"}</dd>
                <dt className="text-muted">Address</dt><dd className="text-foreground">{userDetail.address || "\u2014"}</dd>
                <dt className="text-muted">Emergency Contact</dt><dd className="text-foreground">{userDetail.emergency_contact_name || "\u2014"} {userDetail.emergency_contact_phone ? `(${userDetail.emergency_contact_phone})` : ""}</dd>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Employment Information</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Department</dt><dd className="text-foreground">{userDetail.departments?.name || "\u2014"}</dd>
                <dt className="text-muted">Role</dt><dd className="text-foreground">{userDetail.staffing_categories?.name || "\u2014"}</dd>
                <dt className="text-muted">Rank</dt><dd className="text-foreground">{userDetail.ranks?.name || "\u2014"}</dd>
                <dt className="text-muted">System Role</dt><dd className="text-foreground capitalize">{userDetail.role}</dd>
                <dt className="text-muted">Shift</dt><dd className="text-foreground">{userDetail.shifts?.name || "\u2014"}</dd>
                <dt className="text-muted">Date of Employment</dt><dd className="text-foreground">{userDetail.date_of_employment || "\u2014"}</dd>
                <dt className="text-muted">Employment Type</dt><dd className="text-foreground capitalize">{(userDetail.employment_type || "").replace("_", " ")}</dd>
                <dt className="text-muted">Status</dt><dd className="text-foreground capitalize">{userDetail.status || "active"}</dd>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Payment Information</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Pay Type</dt><dd className="text-foreground capitalize">{userDetail.pay_type || "\u2014"}</dd>
                <dt className="text-muted">Pay Rate</dt><dd className="text-foreground">{userDetail.pay_rate ? `$${Number(userDetail.pay_rate).toLocaleString()}${userDetail.pay_type === "hourly" ? "/hr" : "/mo"}` : "\u2014"}</dd>
                <dt className="text-muted">Bank</dt><dd className="text-foreground">{userDetail.bank_name || "\u2014"}</dd>
                <dt className="text-muted">Account Number</dt><dd className="text-foreground">{userDetail.bank_account_number || "\u2014"}</dd>
                <dt className="text-muted">Tax ID</dt><dd className="text-foreground">{userDetail.tax_id || "\u2014"}</dd>
              </dl>
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted">Failed to load user details.</p>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={modalView === "csv"} onClose={() => setModalView("none")} title="CSV Import">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">
              Upload a CSV file with columns: full_name, email, role, department, phone, date_of_employment, gender, employment_type, pay_type, pay_rate
            </p>
            <p className="mt-1 text-xs text-muted">Required columns: full_name, email. All users will be created with a temporary password.</p>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvFileSelect}
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface/80"
          />
          {csvData.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{csvData.length} rows ready for import</p>
              <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted">
                {csvData.slice(0, 5).map((row, i) => (
                  <p key={i}>{row.full_name} - {row.email} - {row.role || "staff"}</p>
                ))}
                {csvData.length > 5 && <p>...and {csvData.length - 5} more</p>}
              </div>
            </div>
          )}
          {csvResults.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Import Results</p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {csvResults.map((r, i) => (
                  <p key={i} className={r.success ? "text-success" : "text-destructive"}>
                    {r.email}: {r.success ? "Created" : r.error}
                  </p>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalView("none")}>Close</Button>
            {csvData.length > 0 && csvResults.length === 0 && (
              <Button onClick={handleCsvImport} disabled={csvImporting}>
                {csvImporting ? "Importing..." : `Import ${csvData.length} Users`}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </MainContent>
  );
}
