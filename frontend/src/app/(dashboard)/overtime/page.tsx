"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/auth";

interface OvertimeRow {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  reason: string;
  status: string;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export default function OvertimePage() {
  const [entries, setEntries] = useState<OvertimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("staff");
  const [userId, setUserId] = useState("");

  // Log overtime modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  // Review modal
  const [reviewEntry, setReviewEntry] = useState<OvertimeRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile?.role as UserRole) || "staff";
    setUserRole(role);

    const isManager = ["admin", "hr", "manager"].includes(role);

    let query = supabase
      .from("overtime")
      .select("id, user_id, date, hours, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at, profiles(full_name)")
      .order("date", { ascending: false });

    if (!isManager) {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    if (data) setEntries(data as unknown as OvertimeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isManager = ["admin", "hr", "manager"].includes(userRole);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const myEntries = entries.filter((e) => e.user_id === userId);
  const thisMonthHours = myEntries
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.status === "approved";
    })
    .reduce((sum, e) => sum + Number(e.hours), 0);

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  const filteredEntries = statusFilter === "all"
    ? entries
    : entries.filter((e) => e.status === statusFilter);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setFormError("Hours must be between 0 and 24.");
      setFormLoading(false);
      return;
    }

    const { error } = await supabase.from("overtime").insert({
      user_id: user.id,
      date,
      hours: parsedHours,
      reason,
    });

    if (error) {
      setFormError(error.message);
      setFormLoading(false);
      return;
    }

    setShowModal(false);
    setDate("");
    setHours("");
    setReason("");
    setFormLoading(false);
    await fetchData();
  }

  async function handleReview() {
    if (!reviewEntry) return;
    setReviewLoading(true);

    const res = await fetch(`/api/overtime/${reviewEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: reviewStatus,
        reviewer_note: reviewNote || null,
      }),
    });

    if (!res.ok) {
      setReviewLoading(false);
      return;
    }

    setReviewEntry(null);
    setReviewNote("");
    setReviewLoading(false);
    await fetchData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/overtime/${id}`, { method: "DELETE" });
    await fetchData();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/20 text-muted",
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <MainContent
      title="Overtime"
      description={isManager ? "Review team overtime and log your own hours." : "Track and submit overtime hours."}
      actions={
        <Button size="sm" onClick={() => setShowModal(true)}>
          Log Overtime
        </Button>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">My Approved Hours (This Month)</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">{thisMonthHours}h</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">
            {isManager ? "Team Pending Approval" : "My Pending"}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">{pendingCount}</p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="mt-6 flex items-center gap-2">
        <span className="text-sm text-muted">Status:</span>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              {isManager && <th className="px-4 py-3 font-medium text-muted">Employee</th>}
              <th className="px-4 py-3 font-medium text-muted">Date</th>
              <th className="px-4 py-3 font-medium text-muted">Hours</th>
              <th className="px-4 py-3 font-medium text-muted">Reason</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {isManager && <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>}
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                </tr>
              ))
            ) : filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  {isManager && (
                    <td className="px-4 py-3 text-foreground">
                      {entry.profiles?.full_name || "�"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-foreground">{entry.date}</td>
                  <td className="px-4 py-3 text-foreground">{entry.hours}h</td>
                  <td className="px-4 py-3 text-foreground">{entry.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[entry.status] || ""}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {isManager && entry.status === "pending" && entry.user_id !== userId && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setReviewEntry(entry); setReviewStatus("approved"); setReviewNote(""); }}
                        >
                          Review
                        </Button>
                      )}
                      {entry.status === "pending" && entry.user_id === userId && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isManager ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted">
                  No overtime records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Overtime Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Overtime">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <FormInput
            label="Hours"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 2.5"
            required
            min="0.5"
            max="24"
            step="0.5"
          />
          <FormInput
            label="Reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for overtime"
            required
          />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Submitting..." : "Submit"}</Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewEntry !== null}
        onClose={() => setReviewEntry(null)}
        title="Review Overtime"
      >
        {reviewEntry && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">
                {reviewEntry.profiles?.full_name || "Employee"}
              </p>
              <p className="text-sm text-foreground">{reviewEntry.date} � {reviewEntry.hours}h</p>
              <p className="mt-1 text-xs text-muted">{reviewEntry.reason}</p>
            </div>
            <FormSelect
              label="Decision"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              options={[
                { value: "approved", label: "Approve" },
                { value: "rejected", label: "Reject" },
              ]}
            />
            <FormInput
              label="Note (optional)"
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional note"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewEntry(null)}>Cancel</Button>
              <Button
                onClick={handleReview}
                disabled={reviewLoading}
                variant={reviewStatus === "rejected" ? "destructive" : "primary"}
              >
                {reviewLoading ? "Processing..." : reviewStatus === "approved" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainContent>
  );
}
