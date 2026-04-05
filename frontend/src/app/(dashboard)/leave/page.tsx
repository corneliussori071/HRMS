import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

export default function LeavePage() {
  return (
    <MainContent
      title="Leave Management"
      description="Submit and review leave requests."
      actions={<Button size="sm">New Request</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Leave Requests</h2>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">Leave Balance</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Annual</span>
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Sick</span>
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Personal</span>
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
}
