import { createClient } from "@/lib/supabase/server";
import MainContent from "@/components/layout/MainContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const userRole = profile?.role || "staff";
  const isManager = ["admin", "hr", "manager"].includes(userRole);
  const today = new Date().toISOString().split("T")[0];

  const queries = [
    supabase
      .from("attendance")
      .select("status")
      .eq("user_id", user!.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("overtime")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, status, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("attendance")
      .select("id, date, check_in, check_out, status")
      .eq("user_id", user!.id)
      .order("date", { ascending: false })
      .limit(5),
  ];

  if (isManager) {
    queries.push(
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
    );
  }

  const results = await Promise.all(queries);

  const todayAttendance = results[0].data as { status: string } | null;
  const pendingLeaves = results[1].count ?? 0;
  const pendingOvertime = results[2].count ?? 0;
  const recentLeaves = (results[3].data ?? []) as Array<{
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
    profiles: { full_name: string } | null;
  }>;
  const recentAttendance = (results[4].data ?? []) as Array<{
    id: string;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
  }>;
  const totalEmployees = isManager ? (results[5]?.count ?? 0) : 0;

  const statusColors: Record<string, string> = {
    present: "bg-success/10 text-success",
    absent: "bg-destructive/10 text-destructive",
    late: "bg-warning/10 text-warning",
    half_day: "bg-warning/10 text-warning",
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted/20 text-muted",
  };

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "\u2014";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <MainContent
      title="Dashboard"
      description="Overview of key HR metrics and recent activity."
    >
      {/* Stats Grid */}
      <div className={`grid gap-6 ${isManager ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Attendance Today</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {todayAttendance
              ? todayAttendance.status.charAt(0).toUpperCase() +
                todayAttendance.status.slice(1).replace("_", " ")
              : "Not recorded"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">
            {isManager ? "Pending Leave Approvals" : "Pending Leave Requests"}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {pendingLeaves}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">
            {isManager ? "Pending Overtime Approvals" : "Pending Overtime"}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {pendingOvertime}
          </p>
        </div>
        {isManager && (
          <div className="rounded-lg border border-border bg-background p-5">
            <p className="text-sm font-medium text-muted">Total Employees</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {totalEmployees}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Leave Requests */}
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {isManager ? "Recent Leave Requests (Team)" : "Recent Leave Requests"}
          </h2>
          {recentLeaves.length > 0 ? (
            <div className="mt-4 divide-y divide-border">
              {recentLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    {isManager && leave.profiles && (
                      <p className="text-xs font-medium text-primary">
                        {leave.profiles.full_name}
                      </p>
                    )}
                    <p className="text-sm font-medium capitalize text-foreground">
                      {leave.leave_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted">
                      {leave.start_date} to {leave.end_date}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[leave.status] ?? ""}`}
                  >
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No leave requests yet.</p>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Attendance
          </h2>
          {recentAttendance.length > 0 ? (
            <div className="mt-4 divide-y divide-border">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {record.date}
                    </p>
                    <p className="text-xs text-muted">
                      {formatTime(record.check_in)} {"\u2013"}{" "}
                      {formatTime(record.check_out)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[record.status] ?? ""}`}
                  >
                    {record.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No attendance records yet.
            </p>
          )}
        </div>
      </div>
    </MainContent>
  );
}
