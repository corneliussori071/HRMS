"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormInput from "@/components/ui/FormInput";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { OvertimeEntry } from "@/types/overtime";

export default function OvertimePage() {
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  const fetchEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("overtime")
      .select("*")
      .order("date", { ascending: false });
    if (data) setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthHours = entries
    .filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        e.status === "approved"
      );
    })
    .reduce((sum, e) => sum + Number(e.hours), 0);

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    await fetchEntries();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/20 text-muted",
  };

  return (
    <MainContent
      title="Overtime"
      description="Track and submit overtime hours."
      actions={
        <Button size="sm" onClick={() => setShowModal(true)}>
          Log Overtime
        </Button>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">This Month (Approved)</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {thisMonthHours}h
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Pending Approval</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {pendingCount}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Date</th>
              <th className="px-4 py-3 font-medium text-muted">Hours</th>
              <th className="px-4 py-3 font-medium text-muted">Reason</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                </tr>
              ))
            ) : entries.length > 0 ? (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-foreground">{entry.date}</td>
                  <td className="px-4 py-3 text-foreground">{entry.hours}h</td>
                  <td className="px-4 py-3 text-foreground">{entry.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[entry.status] || ""}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted"
                >
                  No overtime records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Overtime"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
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
