import MainContent from "@/components/layout/MainContent";
import Skeleton from "@/components/ui/Skeleton";

export default function DashboardPage() {
  return (
    <MainContent
      title="Dashboard"
      description="Overview of key HR metrics and recent activity."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Attendance Today</p>
          <Skeleton className="mt-2 h-8 w-24" />
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Pending Leave Requests</p>
          <Skeleton className="mt-2 h-8 w-24" />
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Notifications</p>
          <Skeleton className="mt-2 h-8 w-24" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Recent Leave Requests</h2>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Attendance Overview</h2>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </MainContent>
  );
}
