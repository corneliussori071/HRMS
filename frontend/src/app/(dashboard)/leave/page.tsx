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
import { LeaveType, LeaveAllocation } from "@/types/leave-config";

interface LeaveRequestRow {
  id: string;
  user_id: string;
  leave_type: string;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_days: number | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface UserProfile {
  department_id: string | null;
  rank_id: string | null;
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [leaveSystem, setLeaveSystem] = useState<string>("fixed");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("staff");
  const [userId, setUserId] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile>({ department_id: null, rank_id: null });

  // New request modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Review modal
  const [reviewRequest, setReviewRequest] = useState<LeaveRequestRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewApprovedDays, setReviewApprovedDays] = useState("");
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
      .select("role, department_id, rank_id")
      .eq("id", user.id)
      .single();
    const role = (profile?.role as UserRole) || "staff";
    setUserRole(role);
    setUserProfile({
      department_id: profile?.department_id ?? null,
      rank_id: profile?.rank_id ?? null,
    });

    const [settingsRes, typesRes, allocRes, leavesRes] = await Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/leave-types").then((r) => r.json()),
      fetch("/api/leave-allocations").then((r) => r.json()),
      fetch("/api/leaves?pageSize=100").then((r) => r.json()),
    ]);

    if (settingsRes.data?.leave_system) setLeaveSystem(settingsRes.data.leave_system);
    if (typesRes.data) setLeaveTypes(typesRes.data);
    if (allocRes.data) setAllocations(allocRes.data);
    if (leavesRes.data?.items) setRequests(leavesRes.data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isManager = ["admin", "hr", "manager"].includes(userRole);
  const currentYear = new Date().getFullYear();

  function countDays(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    const current = new Date(s);
    while (current <= e) {
      count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  // Filter active types by system and user department
  const activeTypes = leaveTypes.filter((lt) => {
    if (!lt.is_active) return false;
    if (leaveSystem !== "both" && lt.system_type !== leaveSystem) return false;
    // Show org-wide types (no department) and types matching user's department
    if (lt.department_id && lt.department_id !== userProfile.department_id) return false;
    return true;
  });

  // Build balance for current user using rank-based allocations
  const myRequests = requests.filter(
    (r) => r.user_id === userId && new Date(r.start_date).getFullYear() === currentYear
  );

  function getBalanceForType(lt: LeaveType): { used: number; total: number } {
    // Find rank-based allocation first, then fall back to max_days_per_year
    let total = lt.max_days_per_year;
    if (userProfile.rank_id) {
      const rankAlloc = allocations.find(
        (a) => a.leave_type_id === lt.id && a.rank_id === userProfile.rank_id
      );
      if (rankAlloc) total = rankAlloc.days_per_year;
    }

    // Count used: approved requests use approved_days if set, pending also counted
    const used = myRequests
      .filter((r) => (r.status === "approved" || r.status === "pending") && (r.leave_type_id === lt.id))
      .reduce((sum, r) => {
        if (r.status === "approved" && r.approved_days !== null) {
          return sum + r.approved_days;
        }
        return sum + countDays(r.start_date, r.end_date);
      }, 0);

    return { used, total };
  }

  // Filtered requests
  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  // Leave type options: only types available to the user
  const typeOptions = activeTypes.map((lt) => ({ value: lt.id, label: lt.name }));

  // Preview balance when creating a request
  function getRequestPreview(): { requestedDays: number; remaining: number; total: number } | null {
    if (!selectedTypeId || !startDate || !endDate || endDate < startDate) return null;
    const lt = leaveTypes.find((t) => t.id === selectedTypeId);
    if (!lt) return null;
    const { used, total } = getBalanceForType(lt);
    const requestedDays = countDays(startDate, endDate);
    return { requestedDays, remaining: total - used, total };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setFormError(json.error || "Failed to submit leave request");
      setFormLoading(false);
      return;
    }

    setShowModal(false);
    setSelectedTypeId("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setFormLoading(false);
    await fetchData();
  }

  async function handleReview() {
    if (!reviewRequest) return;
    setReviewLoading(true);

    const payload: Record<string, unknown> = {
      status: reviewStatus,
      reviewer_note: reviewNote || null,
    };

    if (reviewStatus === "approved" && reviewApprovedDays) {
      payload.approved_days = Number(reviewApprovedDays);
    }

    const res = await fetch(`/api/leaves/${reviewRequest.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setReviewLoading(false);
      return;
    }

    setReviewRequest(null);
    setReviewNote("");
    setReviewApprovedDays("");
    setReviewLoading(false);
    await fetchData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/leaves/${id}`, { method: "DELETE" });
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

  const preview = getRequestPreview();

  return (
    <MainContent
      title="Leave Management"
      description={isManager ? "Review team leave requests and manage your own." : "Submit and track your leave requests."}
      actions={
        <Button size="sm" onClick={() => setShowModal(true)}>
          New Request
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
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

          {/* Requests List */}
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {isManager ? "Team Leave Requests" : "My Leave Requests"}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const requestedDays = countDays(req.start_date, req.end_date);
                  const displayDays = req.status === "approved" && req.approved_days !== null
                    ? `${req.approved_days} of ${requestedDays} days approved`
                    : `${requestedDays} days`;

                  return (
                    <div key={req.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1">
                        {isManager && req.user_id !== userId && (
                          <p className="text-xs font-medium text-primary">
                            {req.profiles?.full_name || "Unknown employee"}
                          </p>
                        )}
                        <p className="text-sm font-medium capitalize text-foreground">
                          {req.leave_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted">
                          {req.start_date} to {req.end_date} ({displayDays})
                        </p>
                        {req.reason && (
                          <p className="text-xs text-muted">{req.reason}</p>
                        )}
                        {req.reviewer_note && (
                          <p className="text-xs text-muted">
                            Review note: {req.reviewer_note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status] || ""}`}>
                          {req.status}
                        </span>
                        {isManager && req.status === "pending" && req.user_id !== userId && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setReviewRequest(req);
                              setReviewStatus("approved");
                              setReviewNote("");
                              setReviewApprovedDays(String(countDays(req.start_date, req.end_date)));
                            }}
                          >
                            Review
                          </Button>
                        )}
                        {req.status === "pending" && req.user_id === userId && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(req.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  No leave requests found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Sidebar */}
        <div className="rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">Leave Balance</h2>
          <p className="mt-1 text-xs text-muted">Current year ({currentYear})</p>
          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : activeTypes.length > 0 ? (
            <div className="mt-4 space-y-4">
              {activeTypes.map((lt) => {
                const { used, total } = getBalanceForType(lt);
                const remaining = Math.max(0, total - used);
                const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                return (
                  <div key={lt.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{lt.name}</span>
                      <span className="text-xs text-muted">
                        {remaining} remaining
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-border">
                      <div
                        className={`h-2 rounded-full transition-all ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted">
                      <span>{used} used</span>
                      <span>{total} total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No leave types configured. Contact your administrator.
            </p>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Leave Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Leave Type"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            options={typeOptions}
            placeholder="Select leave type"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <FormInput
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
            />
          </div>
          {preview && (
            <div className="rounded-md bg-surface px-3 py-2 text-sm">
              <div className="flex justify-between text-foreground">
                <span>Requested days</span>
                <span className="font-medium">{preview.requestedDays}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Balance remaining</span>
                <span className={preview.remaining < preview.requestedDays ? "font-medium text-destructive" : ""}>
                  {preview.remaining} / {preview.total}
                </span>
              </div>
              {preview.remaining < preview.requestedDays && (
                <p className="mt-1 text-xs text-destructive">
                  Insufficient balance for this request.
                </p>
              )}
            </div>
          )}
          <FormInput
            label="Reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Brief reason for leave"
            required
          />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewRequest !== null}
        onClose={() => setReviewRequest(null)}
        title="Review Leave Request"
      >
        {reviewRequest && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {reviewRequest.profiles?.full_name || "Employee"}
              </p>
              <p className="text-sm capitalize text-foreground">
                {reviewRequest.leave_type.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-muted">
                {reviewRequest.start_date} to {reviewRequest.end_date} ({countDays(reviewRequest.start_date, reviewRequest.end_date)} days requested)
              </p>
              <p className="text-xs text-muted">{reviewRequest.reason}</p>
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
            {reviewStatus === "approved" && (
              <FormInput
                label="Approved Days"
                type="number"
                value={reviewApprovedDays}
                onChange={(e) => setReviewApprovedDays(e.target.value)}
                min="0.5"
                max={String(countDays(reviewRequest.start_date, reviewRequest.end_date))}
                step="0.5"
                placeholder={String(countDays(reviewRequest.start_date, reviewRequest.end_date))}
              />
            )}
            <FormInput
              label="Note (optional)"
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional note to the employee"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewRequest(null)}>
                Cancel
              </Button>
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
