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
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [leaveSystem, setLeaveSystem] = useState<string>("fixed");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("staff");
  const [userId, setUserId] = useState("");

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

    const [settingsRes, typesRes, allocRes] = await Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/leave-types").then((r) => r.json()),
      fetch("/api/leave-allocations" + (role === "staff" ? `?role=${role}` : "")).then((r) => r.json()),
    ]);

    if (settingsRes.data?.leave_system) setLeaveSystem(settingsRes.data.leave_system);
    if (typesRes.data) setLeaveTypes(typesRes.data);
    if (allocRes.data) setAllocations(allocRes.data);

    let query = supabase
      .from("leave_requests")
      .select("id, user_id, leave_type, leave_type_id, start_date, end_date, reason, status, reviewer_id, reviewer_note, reviewed_at, created_at, profiles(full_name)")
      .order("created_at", { ascending: false });

    if (!isManager) {
      query = query.eq("user_id", user.id);
    }

    const { data: requestsData } = await query;
    if (requestsData) setRequests(requestsData as unknown as LeaveRequestRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isManager = ["admin", "hr", "manager"].includes(userRole);
  const currentYear = new Date().getFullYear();

  function countDays(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  // Filter active types by system
  const activeTypes = leaveTypes.filter((lt) => {
    if (!lt.is_active) return false;
    if (leaveSystem === "both") return true;
    return lt.system_type === leaveSystem;
  });

  // Build balance for current user
  const myApproved = requests.filter(
    (r) => r.user_id === userId && r.status === "approved" && new Date(r.start_date).getFullYear() === currentYear
  );

  function getBalanceForType(lt: LeaveType): { used: number; total: number } {
    const roleAlloc = allocations.find(
      (a) => a.leave_type_id === lt.id && a.role === userRole
    );
    const total = roleAlloc ? roleAlloc.days_per_year : lt.max_days_per_year;
    const used = myApproved
      .filter((r) => r.leave_type_id === lt.id || r.leave_type === lt.name.toLowerCase().replace(/ /g, "_"))
      .reduce((sum, r) => sum + countDays(r.start_date, r.end_date), 0);
    return { used, total };
  }

  // Filtered requests
  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  // Leave type options for form
  const typeOptions = activeTypes.map((lt) => ({ value: lt.id, label: lt.name }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedType = leaveTypes.find((lt) => lt.id === selectedTypeId);

    const { error } = await supabase.from("leave_requests").insert({
      user_id: user.id,
      leave_type: selectedType ? selectedType.name.toLowerCase().replace(/ /g, "_") : "annual",
      leave_type_id: selectedTypeId || null,
      start_date: startDate,
      end_date: endDate,
      reason,
    });

    if (error) {
      setFormError(error.message);
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

    const res = await fetch(`/api/leaves/${reviewRequest.id}`, {
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

    setReviewRequest(null);
    setReviewNote("");
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
                filteredRequests.map((req) => (
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
                        {req.start_date} to {req.end_date} ({countDays(req.start_date, req.end_date)} days) � {req.reason}
                      </p>
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
                        <Button size="sm" variant="secondary" onClick={() => { setReviewRequest(req); setReviewStatus("approved"); setReviewNote(""); }}>
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
                ))
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
          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : activeTypes.length > 0 ? (
            <div className="mt-4 space-y-3">
              {activeTypes.map((lt) => {
                const { used, total } = getBalanceForType(lt);
                const remaining = Math.max(0, total - used);
                return (
                  <div key={lt.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{lt.name}</span>
                      <span className="text-sm font-medium text-foreground">
                        {remaining} / {total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-border">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${total > 0 ? Math.min(100, (used / total) * 100) : 0}%` }}
                      />
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
            required
          />
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
            <div className="rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-foreground">
                {reviewRequest.profiles?.full_name || "Employee"}
              </p>
              <p className="text-sm capitalize text-foreground">
                {reviewRequest.leave_type.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-muted">
                {reviewRequest.start_date} to {reviewRequest.end_date} ({countDays(reviewRequest.start_date, reviewRequest.end_date)} days)
              </p>
              <p className="mt-1 text-xs text-muted">{reviewRequest.reason}</p>
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
