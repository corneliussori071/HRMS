import MainContent from "@/components/layout/MainContent";
import Skeleton from "@/components/ui/Skeleton";

export default function ProfilePage() {
  return (
    <MainContent title="Profile" description="View and update your personal information.">
      <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted">Full Name</p>
                <Skeleton className="mt-1 h-5 w-40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted">Email</p>
                <Skeleton className="mt-1 h-5 w-48" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted">Department</p>
                <Skeleton className="mt-1 h-5 w-32" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted">Role</p>
                <Skeleton className="mt-1 h-5 w-24" />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold text-foreground">Account Settings</h2>
              <div className="mt-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
}
