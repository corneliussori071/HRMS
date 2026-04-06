"use client";

import { useState, useEffect, useCallback } from "react";
import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { Attendance } from "@/types/attendance";

export default function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchRecords = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);

    if (data) {
      setRecords(data);
      setTodayRecord(data.find((r) => r.date === today) || null);
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function handleCheckIn() {
    setActionLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("attendance").insert({
      user_id: user.id,
      date: today,
      check_in: new Date().toISOString(),
      status: "present",
    });
    await fetchRecords();
    setActionLoading(false);
  }

  async function handleCheckOut() {
    if (!todayRecord) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", todayRecord.id);
    await fetchRecords();
    setActionLoading(false);
  }

  const statusColors: Record<string, string> = {
    present: "bg-success/10 text-success",
    absent: "bg-destructive/10 text-destructive",
    late: "bg-warning/10 text-warning",
    half_day: "bg-warning/10 text-warning",
  };

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const checkInAction = !todayRecord ? (
    <Button size="sm" onClick={handleCheckIn} disabled={actionLoading}>
      {actionLoading ? "Processing..." : "Check In"}
    </Button>
  ) : !todayRecord.check_out ? (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleCheckOut}
      disabled={actionLoading}
    >
      {actionLoading ? "Processing..." : "Check Out"}
    </Button>
  ) : null;

  return (
    <MainContent
      title="Attendance"
      description="Track and manage employee attendance records."
      actions={checkInAction}
    >
      {/* Today's Status */}
      <div className="mb-6 rounded-lg border border-border bg-background p-5">
        <p className="text-sm font-medium text-muted">Today&apos;s Status</p>
        {todayRecord ? (
          <div className="mt-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[todayRecord.status] || ""}`}
            >
              {todayRecord.status.replace("_", " ")}
            </span>
            <p className="mt-1 text-xs text-muted">
              Check in: {formatTime(todayRecord.check_in)} | Check out:{" "}
              {formatTime(todayRecord.check_out)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground">Not recorded yet</p>
        )}
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Date</th>
              <th className="px-4 py-3 font-medium text-muted">Check In</th>
              <th className="px-4 py-3 font-medium text-muted">Check Out</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                  </td>
                </tr>
              ))
            ) : records.length > 0 ? (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-foreground">{record.date}</td>
                  <td className="px-4 py-3 text-foreground">
                    {formatTime(record.check_in)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatTime(record.check_out)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[record.status] || ""}`}
                    >
                      {record.status.replace("_", " ")}
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
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </MainContent>
  );
}
