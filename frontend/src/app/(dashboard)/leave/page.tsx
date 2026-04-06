"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import FormSelect from "@/components/ui/FormSelect";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { LeaveRequest } from "@/types/leave";

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const fetchRequests = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const currentYear = new Date().getFullYear();
  const approvedThisYear = requests.filter(
    (r) =>
      r.status === "approved" &&
      new Date(r.start_date).getFullYear() === currentYear
  );

  function countDays(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  const balances: Record<string, { used: number; total: number }> = {
    annual: { used: 0, total: 20 },
    sick: { used: 0, total: 10 },
    personal: { used: 0, total: 5 },
  };

  approvedThisYear.forEach((r) => {
    const days = countDays(r.start_date, r.end_date);
    if (balances[r.leave_type]) {
      balances[r.leave_type].used += days;
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("leave_requests").insert({
      user_id: user.id,
      leave_type: leaveType,
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
    setLeaveType("annual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setFormLoading(false);
    await fetchRequests();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/20 text-muted",
  };

  return (
    <MainContent
      title="Leave Management"
      description="Submit and review leave requests."
      actions={
        <Button size="sm" onClick={() => setShowModal(true)}>
          New Request
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Leave Requests
              </h2>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">
                        {req.leave_type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted">
                        {req.start_date} → {req.end_date} · {req.reason}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status] || ""}`}
                    >
                      {req.status}
                    </span>
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

        <div className="rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Leave Balance
          </h2>
          <div className="mt-4 space-y-3">
            {Object.entries(balances).map(([type, { used, total }]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm capitalize text-muted">{type}</span>
                <span className="text-sm font-medium text-foreground">
                  {total - used} / {total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Leave Request"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Leave Type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            options={[
              { value: "annual", label: "Annual" },
              { value: "sick", label: "Sick" },
              { value: "personal", label: "Personal" },
              { value: "unpaid", label: "Unpaid" },
              { value: "maternity", label: "Maternity" },
              { value: "paternity", label: "Paternity" },
              { value: "bereavement", label: "Bereavement" },
            ]}
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
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainContent>
  );
}
