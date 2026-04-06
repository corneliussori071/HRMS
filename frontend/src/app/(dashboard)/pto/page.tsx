"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { LeaveRequest } from "@/types/leave";

const PTO_TYPES = ["annual", "personal"];

export default function PTOPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPTO = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .in("leave_type", PTO_TYPES)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPTO();
  }, [fetchPTO]);

  const currentYear = new Date().getFullYear();

  function countDays(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  const totalPTO = 25; // annual (20) + personal (5)
  const usedPTO = requests
    .filter(
      (r) =>
        r.status === "approved" &&
        new Date(r.start_date).getFullYear() === currentYear
    )
    .reduce((sum, r) => sum + countDays(r.start_date, r.end_date), 0);
  const pendingPTO = requests.filter((r) => r.status === "pending").length;

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/20 text-muted",
  };

  return (
    <MainContent
      title="Paid Time Off"
      description="View and manage your PTO balance and history."
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Available PTO</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {totalPTO - usedPTO} days
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Used This Year</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {usedPTO} days
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Pending Requests</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {pendingPTO}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Date Range</th>
              <th className="px-4 py-3 font-medium text-muted">Days</th>
              <th className="px-4 py-3 font-medium text-muted">Type</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-36" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-8" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                </tr>
              ))
            ) : requests.length > 0 ? (
              requests.map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-foreground">
                    {req.start_date} → {req.end_date}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {countDays(req.start_date, req.end_date)}
                  </td>
                  <td className="px-4 py-3 capitalize text-foreground">
                    {req.leave_type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[req.status] || ""}`}
                    >
                      {req.status}
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
                  No PTO records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </MainContent>
  );
}
